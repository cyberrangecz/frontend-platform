import { randomUUID } from 'node:crypto';
import { expect, test as base } from '../../fixtures';
import { createPoolOnDefinition } from '../pool/pool-data';
import { DAY_MILLISECONDS, fromNow, HOUR_MILLISECONDS } from '../../time';
import { createTrainingInstance, TOKEN_PREFIX_LIMIT } from './instance-data';

/** A training instance a test created for itself, with the pool it holds. */
export interface OwnInstance {
    id: number;
    title: string;
    /** Access token including the PIN the backend appended. */
    accessToken: string;
    /** Prefix the instance was created with, without the PIN. */
    accessTokenPrefix: string;
    poolId: number;
    startTime: Date;
    endTime: Date;
}

/** What a test chooses about an instance it creates. */
export interface InstanceBlueprint {
    /** Short word naming the instance's role in the test; part of the title. */
    purpose: string;
    /** Delay between creation and the start time; one hour when omitted. */
    startsInMilliseconds?: number;
    /** Length of the training window; one day when omitted. */
    durationMilliseconds?: number;
    /** Prefix of the access token; derived from the title when omitted. */
    accessTokenPrefix?: string;
}

interface InstanceFixtures {
    /** Creates an unlocked pool on the shared sandbox definition without allocating a sandbox; resolves to its id. */
    createOwnPool: (purpose: string) => Promise<number>;
    /**
     * Creates an instance on the shared released training definition, held by a pool of its own so
     * the shared pool stays untouched.
     */
    createInstance: (blueprint: InstanceBlueprint) => Promise<OwnInstance>;
}

/** The suite's `test` extended with the factories for the pools and training instances of this area. */
export const test = base.extend<InstanceFixtures>({
    createOwnPool: async ({ apiAs, shared, uniqueName }, use) => {
        await use(async (purpose) => {
            const pool = await createPoolOnDefinition(apiAs('sandboxOrganizer').sandbox, shared.sandboxDefinition.id, {
                maxSize: 1,
                comment: uniqueName(purpose),
            });
            return pool.id;
        });
    },
    createInstance: async ({ apiAs, shared, uniqueName, createOwnPool }, use) => {
        await use(async (blueprint) => {
            const title = `${uniqueName(blueprint.purpose)}-${randomUUID().slice(0, 6)}`;
            const accessTokenPrefix = (blueprint.accessTokenPrefix ?? title).slice(0, TOKEN_PREFIX_LIMIT);
            const startTime = fromNow(blueprint.startsInMilliseconds ?? HOUR_MILLISECONDS);
            const endTime = new Date(startTime.getTime() + (blueprint.durationMilliseconds ?? DAY_MILLISECONDS));
            const poolId = await createOwnPool(`${blueprint.purpose}-pool`);
            const created = await createTrainingInstance(apiAs('trainingOrganizer').training, {
                title,
                startTime,
                endTime,
                accessTokenPrefix,
                trainingDefinitionId: shared.trainingDefinition.id,
                poolId,
            });
            return {
                id: created.id,
                title: created.title,
                accessToken: created.access_token,
                accessTokenPrefix,
                poolId,
                startTime,
                endTime,
            };
        });
    },
});

export { expect };
