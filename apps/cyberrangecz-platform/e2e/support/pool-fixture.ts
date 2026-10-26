import { test as base } from '@playwright/test';
import { PlatformAccount, signIn } from './platform-session';
import { createPool, deletePool, sandboxRepairEnvironment } from './sandbox-repair-support';

interface PoolOptions {
    poolAccount: PlatformAccount | undefined;
    poolSize: number;
    poolComment: string;
}

interface PoolFixtures {
    poolId: number;
}

/**
 * Test that provides `poolId`: a pool created by the signed-in `poolAccount` with `poolSize`
 * and `poolComment`, removed after the test. Every test owns its pool, so no id is shared
 * between tests.
 */
export const poolTest = base.extend<PoolOptions & PoolFixtures>({
    poolAccount: [undefined, { option: true }],
    poolSize: [1, { option: true }],
    poolComment: ['', { option: true }],
    poolId: async ({ page, poolAccount, poolSize, poolComment }, use, testInfo) => {
        if (poolAccount === undefined) {
            throw new Error('poolAccount is not set: the spec has to skip itself without an account');
        }
        testInfo.setTimeout(2 * sandboxRepairEnvironment.buildTimeoutMs);
        await signIn(page, poolAccount);
        const poolId = await createPool(page, poolSize, poolComment);
        try {
            await use(poolId);
        } finally {
            await deletePool(page, poolId);
        }
    },
});
