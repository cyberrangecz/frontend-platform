import { ApiError, type ApiClient } from '../../api/api-client';
import type { SharedFixture } from '../../shared-fixture';

/** A pool as the sandbox service answers it. */
export interface PoolRecord {
    id: number;
    max_size: number;
    size: number;
    comment: string | null;
    lock_id: number | null;
    send_emails: boolean;
    definition: { id: number; name: string; rev: string };
}

/** One sandbox allocation unit of a pool as the sandbox service answers it. */
export interface AllocationUnitRecord {
    id: number;
    pool_id: number;
    locked: boolean;
    comment: string | null;
    allocation_request: { id: number; stages: string[] };
    cleanup_request: { id: number; stages: string[] } | null;
}

/** A sandbox of a pool; its id is the sandbox uuid. */
export interface SandboxRecord {
    id: string;
    allocation_unit_id: number;
    lock_id: number | null;
}

export interface NewPoolOptions {
    maxSize?: number;
    comment?: string;
    sendEmails?: boolean;
}

const DEFAULT_MAX_SIZE = 3;

/** Creates a pool on a sandbox definition. */
export function createPoolOnDefinition(
    sandbox: ApiClient,
    definitionId: number,
    options: NewPoolOptions = {},
): Promise<PoolRecord> {
    return sandbox.post<PoolRecord>('/pools', {
        definition_id: definitionId,
        max_size: options.maxSize ?? DEFAULT_MAX_SIZE,
        comment: options.comment ?? '',
        visible: true,
        send_emails: options.sendEmails ?? false,
    });
}

/** Creates a pool on the shared sandbox definition. */
export function createPool(
    sandbox: ApiClient,
    shared: SharedFixture,
    options: NewPoolOptions = {},
): Promise<PoolRecord> {
    return createPoolOnDefinition(sandbox, shared.sandboxDefinition.id, options);
}

export function readPool(sandbox: ApiClient, poolId: number): Promise<PoolRecord> {
    return sandbox.get<PoolRecord>(`/pools/${poolId}`);
}

export function listPools(sandbox: ApiClient): Promise<PoolRecord[]> {
    return sandbox.getAll<PoolRecord>('/pools');
}

/** The pool whose comment equals the text, if one exists. */
export async function findPoolByComment(
    sandbox: ApiClient,
    comment: string,
): Promise<PoolRecord | undefined> {
    return (await listPools(sandbox)).find((pool) => pool.comment === comment);
}

/** Locks a pool the way the pool overview does, with no training access token. */
export async function lockPool(sandbox: ApiClient, poolId: number): Promise<void> {
    await sandbox.post(`/pools/${poolId}/locks`, { training_access_token: null });
}

export function listAllocationUnits(
    sandbox: ApiClient,
    poolId: number,
): Promise<AllocationUnitRecord[]> {
    return sandbox.getAll<AllocationUnitRecord>(`/pools/${poolId}/sandbox-allocation-units`);
}

export function listSandboxes(sandbox: ApiClient, poolId: number): Promise<SandboxRecord[]> {
    return sandbox.getAll<SandboxRecord>(`/pools/${poolId}/sandboxes`);
}

/** The text the sandbox definition selector shows for the shared sandbox definition. */
export async function sharedDefinitionLabel(
    sandbox: ApiClient,
    shared: SharedFixture,
): Promise<string> {
    const definition = await sandbox.get<{ name: string; rev: string }>(
        `/definitions/${shared.sandboxDefinition.id}`,
    );
    return `${definition.name} [${definition.rev}]`;
}

/** Creates pools until the service lists at least the given number of them. */
export async function ensurePoolCount(
    sandbox: ApiClient,
    shared: SharedFixture,
    count: number,
    comment: string,
): Promise<void> {
    const existing = (await listPools(sandbox)).length;
    for (let created = existing; created < count; created++) {
        await createPool(sandbox, shared, { maxSize: 1, comment });
    }
}

/** The lock flag and cleanup request of every allocation unit of a pool, keyed by unit id. */
export async function snapshotAllocationUnits(
    sandbox: ApiClient,
    poolId: number,
): Promise<Record<number, { locked: boolean; cleanupRequestId: number | null }>> {
    const units = await listAllocationUnits(sandbox, poolId);
    return Object.fromEntries(
        units.map((unit) => [unit.id, { locked: unit.locked, cleanupRequestId: unit.cleanup_request?.id ?? null }]),
    );
}

/** Whether the sandbox service still lists the pool. */
export async function poolExists(sandbox: ApiClient, poolId: number): Promise<boolean> {
    return (await listPools(sandbox)).some((pool) => pool.id === poolId);
}

/** The allocation unit with the given id, if its pool still lists it. */
export async function findAllocationUnit(
    sandbox: ApiClient,
    poolId: number,
    allocationUnitId: number,
): Promise<AllocationUnitRecord | undefined> {
    return (await listAllocationUnits(sandbox, poolId)).find((unit) => unit.id === allocationUnitId);
}

/** Whether every stage of the unit's allocation request has finished. */
export function isBuildFinished(unit: AllocationUnitRecord): boolean {
    return unit.allocation_request.stages.every((stage) => stage === 'FINISHED');
}

const REMOVAL_POLL_MILLISECONDS = 10_000;
const REMOVAL_WAIT_MILLISECONDS = 15 * 60_000;

async function ignoringNotFound(action: () => Promise<unknown>): Promise<void> {
    try {
        await action();
    } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
            throw error;
        }
    }
}

/**
 * Unlocks an allocation unit and requests the removal of its sandbox, unless a removal is already
 * under way. Safe to repeat and when the unit is already gone.
 */
export async function requestAllocationUnitRemoval(
    sandbox: ApiClient,
    unit: AllocationUnitRecord,
): Promise<void> {
    if (unit.cleanup_request) {
        return;
    }
    await ignoringNotFound(async () => {
        if (unit.locked) {
            await sandbox.delete(`/sandbox-allocation-units/${unit.id}/lock`);
        }
        await sandbox.post(`/sandbox-allocation-units/${unit.id}/cleanup-request`, undefined, {
            force: true,
        });
    });
}

async function waitUntilNoUnitLeft(
    sandbox: ApiClient,
    poolId: number,
    remainingUnits: () => Promise<AllocationUnitRecord[]>,
): Promise<void> {
    const deadline = Date.now() + REMOVAL_WAIT_MILLISECONDS;
    while ((await remainingUnits()).length > 0) {
        if (Date.now() >= deadline) {
            throw new Error(`Sandboxes of pool ${poolId} were not removed within the wait`);
        }
        await new Promise((resolve) => setTimeout(resolve, REMOVAL_POLL_MILLISECONDS));
    }
}

/**
 * Whether a chain's allocation unit can carry on: it still exists and its allocation did not
 * fail. A failed unit is removed, and awaited, so the pool slot is free for a fresh allocation.
 */
export async function keepOrRemoveAllocationUnit(
    sandbox: ApiClient,
    poolId: number,
    allocationUnitId: number,
): Promise<boolean> {
    const unit = await findAllocationUnit(sandbox, poolId, allocationUnitId);
    if (unit === undefined) {
        return false;
    }
    if (!unit.allocation_request.stages.includes('FAILED')) {
        return true;
    }
    await requestAllocationUnitRemoval(sandbox, unit);
    await waitUntilNoUnitLeft(sandbox, poolId, async () =>
        (await listAllocationUnits(sandbox, poolId)).filter((candidate) => candidate.id === allocationUnitId),
    );
    return false;
}

/**
 * Removes a pool with every sandbox of it: unlocks the sandboxes, requests their removal, waits
 * until none is left, then unlocks and deletes the pool. Safe to repeat and when the pool is
 * already gone.
 */
export async function removePool(sandbox: ApiClient, poolId: number): Promise<void> {
    const pool = (await listPools(sandbox)).find((candidate) => candidate.id === poolId);
    if (!pool) {
        return;
    }
    for (const unit of await listAllocationUnits(sandbox, poolId)) {
        await requestAllocationUnitRemoval(sandbox, unit);
    }
    await waitUntilNoUnitLeft(sandbox, poolId, async () => listAllocationUnits(sandbox, poolId));
    await ignoringNotFound(async () => {
        if (pool.lock_id !== null) {
            await sandbox.delete(`/pools/${poolId}/locks/${pool.lock_id}`);
        }
        await sandbox.delete(`/pools/${poolId}`);
    });
}
