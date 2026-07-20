import { describe, expect, it } from 'vitest';
import { requestSingleTabClaim } from './single-tab-claim';

/**
 * Acquires and holds a lock until the returned release callback runs, simulating a prior holder tab.
 *
 * @param lockName Name of the lock to hold.
 * @returns A callback that releases the held lock.
 */
function holdLock(lockName: string): () => void {
    let release!: () => void;
    void navigator.locks.request(lockName, { mode: 'exclusive' }, () => new Promise<void>((resolve) => {
        release = resolve;
    }));
    return () => release();
}

describe('requestSingleTabClaim', () => {
    it('grants immediately and reports not blocked when the lock is free', async () => {
        const claim = requestSingleTabClaim('claim-free');

        await expect(claim.granted).resolves.toBeUndefined();
        await expect(claim.blocked).resolves.toBe(false);
    });

    it('reports blocked when another holder already owns the lock', async () => {
        holdLock('claim-contended');

        const claim = requestSingleTabClaim('claim-contended');

        await expect(claim.blocked).resolves.toBe(true);
    });

    it('grants the claim once the prior holder releases the lock', async () => {
        const release = holdLock('claim-recovery');
        const claim = requestSingleTabClaim('claim-recovery');
        await expect(claim.blocked).resolves.toBe(true);

        release();

        await expect(claim.granted).resolves.toBeUndefined();
    });

    it('grants without enforcement when the Web Locks API is unavailable', async () => {
        const lockManager = navigator.locks;
        (navigator as unknown as { locks: unknown }).locks = undefined;
        try {
            const claim = requestSingleTabClaim('claim-no-locks');

            await expect(claim.granted).resolves.toBeUndefined();
            await expect(claim.blocked).resolves.toBe(false);
        } finally {
            (navigator as unknown as { locks: unknown }).locks = lockManager;
        }
    });
});
