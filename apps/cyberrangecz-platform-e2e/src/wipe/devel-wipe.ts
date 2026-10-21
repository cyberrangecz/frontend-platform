import { type Api, ApiError } from '../support/api/api-client';
import { ensureDefinition, FILLER_SOURCES } from '../support/pages/sandbox-definition/definition-source';
import type { LeftoverReport } from './leftover-report';

/** Groups the wipe never deletes. */
export const KEPT_GROUP_NAMES = [
    'DEFAULT-GROUP',
    'USER-AND-GROUP_ADMINISTRATOR',
    'USER-AND-GROUP_USER',
    'All Mighty Users',
] as const;

const REMOVAL_POLL_MILLISECONDS = 15_000;

interface Identified {
    id: number;
}

interface TrainingDefinition extends Identified {
    title: string;
    state: string;
}

interface Pool extends Identified {
    lock_id: number | null;
    comment?: string;
}

interface AllocationUnit extends Identified {
    locked: boolean;
    cleanup_request: { id: number; stages: string[] } | null;
}

interface GroupView extends Identified {
    name: string;
    can_be_deleted: boolean;
}

interface GroupDetail extends GroupView {
    users: Identified[];
}

const sleep = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Deletes devel content in dependency order, recording every entity that resists into the
 * report and moving on. User accounts are never touched.
 */
export class DevelWipe {
    constructor(
        private readonly api: Api,
        private readonly report: LeftoverReport,
    ) {}

    async deleteTrainingRuns(): Promise<void> {
        const instances = await this.api.training.getAll<Identified>('/training-instances');
        for (const instance of instances) {
            const runs = await this.api.training.getAll<Identified>(
                `/training-instances/${instance.id}/training-runs`,
            );
            for (const run of runs) {
                await this.report.attempt({ kind: 'training run', id: run.id }, () =>
                    this.api.training.delete(`/training-runs/${run.id}`, undefined, {
                        forceDelete: true,
                    }),
                );
            }
        }
    }

    /**
     * Unlocks every sandbox, requests its removal unless one is already under way, then waits
     * until every pool is empty or only failed removals remain.
     */
    async removeSandboxes(timeoutMilliseconds: number): Promise<void> {
        const pools = await this.api.sandbox.getAll<Pool>('/pools');
        for (const pool of pools) {
            for (const unit of await this.units(pool.id)) {
                await this.requestRemoval(unit);
            }
        }
        const deadline = Date.now() + timeoutMilliseconds;
        let remaining = await this.unitsUnderRemoval(pools);
        while (remaining.length > 0 && Date.now() < deadline) {
            await sleep(REMOVAL_POLL_MILLISECONDS);
            remaining = await this.unitsUnderRemoval(pools);
        }
        const unitsLeft = await this.allUnits(pools);
        for (const unit of unitsLeft.filter((candidate) => candidate.cleanup_request)) {
            this.report.add({
                kind: 'sandbox allocation unit',
                id: unit.id,
                reason: unit.cleanup_request?.stages.includes('FAILED')
                    ? `removal failed (stages ${unit.cleanup_request.stages.join(', ')})`
                    : 'still present after the removal wait',
            });
        }
    }

    async deleteTrainingInstances(): Promise<void> {
        const instances = await this.api.training.getAll<Identified & { title: string }>(
            '/training-instances',
        );
        for (const instance of instances) {
            await this.report.attempt(
                { kind: 'training instance', id: instance.id, label: instance.title },
                () =>
                    this.api.training.delete(`/training-instances/${instance.id}`, undefined, {
                        forceDelete: true,
                    }),
            );
        }
    }

    /** Deletes every training definition, moving a released one back to unreleased first. */
    async deleteTrainingDefinitions(): Promise<void> {
        const definitions =
            await this.api.training.getAll<TrainingDefinition>('/training-definitions');
        for (const definition of definitions) {
            await this.report.attempt(
                { kind: 'training definition', id: definition.id, label: definition.title },
                async () => {
                    if (definition.state === 'RELEASED') {
                        await this.api.training.put(
                            `/training-definitions/${definition.id}/states/UNRELEASED`,
                        );
                    }
                    await this.api.training.delete(`/training-definitions/${definition.id}`);
                },
            );
        }
    }

    async deletePools(): Promise<void> {
        for (const pool of await this.api.sandbox.getAll<Pool>('/pools')) {
            await this.report.attempt({ kind: 'pool', id: pool.id, label: pool.comment }, async () => {
                if (pool.lock_id !== null) {
                    await this.api.sandbox.delete(`/pools/${pool.id}/locks/${pool.lock_id}`);
                }
                await this.api.sandbox.delete(`/pools/${pool.id}`);
            });
        }
    }

    async deleteSandboxDefinitions(): Promise<void> {
        const definitions = await this.api.sandbox.getAll<Identified & { name?: string }>(
            '/definitions',
        );
        for (const definition of definitions) {
            await this.report.attempt(
                { kind: 'sandbox definition', id: definition.id, label: definition.name },
                () => this.api.sandbox.delete(`/definitions/${definition.id}`),
            );
        }
    }

    /** Registers the filler sandbox definitions the paging specs count on. */
    async registerFillerSandboxDefinitions(): Promise<void> {
        for (const source of FILLER_SOURCES) {
            await this.report.attempt(
                { kind: 'filler sandbox definition', id: `${source.url}@${source.rev}` },
                () => ensureDefinition(this.api.sandbox, source),
            );
        }
    }

    /** Empties and deletes every group except the kept ones. */
    async deleteGroups(): Promise<void> {
        const groups = await this.api.userAndGroup.getAll<GroupView>('/groups');
        const kept: readonly string[] = KEPT_GROUP_NAMES;
        for (const group of groups) {
            if (kept.includes(group.name) || !group.can_be_deleted) {
                continue;
            }
            await this.report.attempt({ kind: 'group', id: group.id, label: group.name }, async () => {
                const detail = await this.api.userAndGroup.get<GroupDetail>(`/groups/${group.id}`);
                if (detail.users.length > 0) {
                    await this.api.userAndGroup.delete(
                        `/groups/${group.id}/users`,
                        detail.users.map((user) => user.id),
                    );
                }
                await this.api.userAndGroup.delete(`/groups/${group.id}`);
            });
        }
    }

    private units(poolId: number): Promise<AllocationUnit[]> {
        return this.api.sandbox.getAll<AllocationUnit>(`/pools/${poolId}/sandbox-allocation-units`);
    }

    private async allUnits(pools: Pool[]): Promise<AllocationUnit[]> {
        const perPool = await Promise.all(pools.map((pool) => this.units(pool.id)));
        return perPool.flat();
    }

    private async unitsUnderRemoval(pools: Pool[]): Promise<AllocationUnit[]> {
        return (await this.allUnits(pools)).filter(
            (unit) => unit.cleanup_request && !unit.cleanup_request.stages.includes('FAILED'),
        );
    }

    /**
     * Unlocks a sandbox and asks for its removal. A unit whose removal already started, for
     * example after its training run was deleted, is left to finish.
     */
    private async requestRemoval(unit: AllocationUnit): Promise<void> {
        if (unit.cleanup_request) {
            return;
        }
        await this.report.attempt({ kind: 'sandbox allocation unit', id: unit.id }, async () => {
            if (unit.locked) {
                await this.ignoringNotFound(() =>
                    this.api.sandbox.delete(`/sandbox-allocation-units/${unit.id}/lock`),
                );
            }
            try {
                await this.api.sandbox.post(
                    `/sandbox-allocation-units/${unit.id}/cleanup-request`,
                    undefined,
                    { force: true },
                );
            } catch (error) {
                const current = await this.api.sandbox
                    .get<AllocationUnit>(`/sandbox-allocation-units/${unit.id}`)
                    .catch(() => undefined);
                if (current?.cleanup_request) {
                    return;
                }
                throw error;
            }
        });
    }

    private async ignoringNotFound(action: () => Promise<unknown>): Promise<void> {
        try {
            await action();
        } catch (error) {
            if (!(error instanceof ApiError && error.status === 404)) {
                throw error;
            }
        }
    }
}
