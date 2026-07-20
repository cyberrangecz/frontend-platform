import { InjectionToken } from '@angular/core';

/**
 * A tab's claim on the exclusive single-writer lock that guards one cache database.
 *
 * The cache's `opfs-sahpool` VFS is single-connection per origin; only the tab holding the claim
 * may open the database. Other tabs observe {@link blocked} and render a blocked state instead.
 */
export interface CacheClaim {
    /**
     * Resolves once this tab holds the exclusive claim — immediately for the first tab, or later
     * (when a prior holder's tab is destroyed) for a tab that started blocked.
     */
    readonly granted: Promise<void>;
    /**
     * Resolves to whether this tab was denied the claim on its first attempt because another tab
     * already holds it. Resolves to `false` when this tab is the holder, or when the Web Locks API
     * is unavailable (in which case the claim is unenforced and the tab behaves as the holder).
     */
    readonly blocked: Promise<boolean>;
}

/** Carries the active tab's {@link CacheClaim} for injection into guards and the blocked screen. */
export const CACHE_CLAIM = new InjectionToken<CacheClaim>('CACHE_CLAIM');

/**
 * Requests the exclusive single-writer claim for a cache database through the Web Locks API.
 *
 * A single `ifAvailable` request decides the tab's role without ever self-deadlocking: a granted
 * lock marks this tab the holder and is retained for the page's lifetime (the browser releases it
 * when the page is destroyed); a `null` grant marks the tab blocked and enqueues a second, ordinary
 * request that resolves only once the prior holder releases, driving recovery.
 *
 * When the Web Locks API is unavailable (e.g. server-side rendering or an unsupported browser), the
 * claim is unenforced: the returned claim is granted immediately and never blocked.
 *
 * @param lockName Name of the Web Lock guarding the cache database; must be stable per database per
 *   origin so every tab contends for the same lock.
 * @returns The active tab's claim.
 */
export function requestSingleTabClaim(lockName: string): CacheClaim {
    const lockManager = globalThis.navigator?.locks;
    if (!lockManager) {
        return { granted: Promise.resolve(), blocked: Promise.resolve(false) };
    }

    let markGranted!: () => void;
    const granted = new Promise<void>((resolve) => {
        markGranted = resolve;
    });
    let markBlocked!: (value: boolean) => void;
    const blocked = new Promise<boolean>((resolve) => {
        markBlocked = resolve;
    });

    const heldUntilPageDestroyed = new Promise<never>(() => undefined);

    void lockManager.request(lockName, { mode: 'exclusive', ifAvailable: true }, (lock: Lock | null) => {
        if (lock) {
            markBlocked(false);
            markGranted();
            return heldUntilPageDestroyed;
        }
        markBlocked(true);
        return lockManager.request(lockName, { mode: 'exclusive' }, () => {
            markGranted();
            return heldUntilPageDestroyed;
        });
    });

    return { granted, blocked };
}
