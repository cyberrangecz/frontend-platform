import '@analogjs/vitest-angular/setup-zone';

import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { getTestBed } from '@angular/core/testing';

// navigator.locks polyfill — single-tab claim acquisition requires it; absent in jsdom 22.
// Models the exclusive-mode subset the cache claim uses: the 3-argument (name, options, callback)
// signature, ifAvailable probes invoking the callback with null without enqueuing, FIFO queueing of
// ordinary requests, and release of the lock when the granted callback's returned promise settles.
interface PolyfillLock {
    name: string;
    mode: string;
}
type LockGrantedCallback = (lock: PolyfillLock | null) => Promise<unknown> | unknown;
interface LockRequestOptions {
    mode?: string;
    ifAvailable?: boolean;
}

const heldLockNames = new Set<string>();
const lockWaitQueues = new Map<string, Array<() => void>>();

function grantNextWaiter(name: string): void {
    heldLockNames.delete(name);
    const next = lockWaitQueues.get(name)?.shift();
    if (next) next();
}

(globalThis as any).navigator ??= {};
(navigator as any).locks ??= {
    async request(
        name: string,
        optionsOrCallback: LockRequestOptions | LockGrantedCallback,
        maybeCallback?: LockGrantedCallback,
    ): Promise<unknown> {
        const options: LockRequestOptions = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
        const callback: LockGrantedCallback =
            typeof optionsOrCallback === 'function' ? optionsOrCallback : (maybeCallback as LockGrantedCallback);

        if (heldLockNames.has(name)) {
            if (options.ifAvailable) {
                return callback(null);
            }
            await new Promise<void>((resolve) => {
                const waiters = lockWaitQueues.get(name) ?? [];
                waiters.push(resolve);
                lockWaitQueues.set(name, waiters);
            });
        }

        heldLockNames.add(name);
        try {
            return await callback({ name, mode: options.mode ?? 'exclusive' });
        } finally {
            grantNextWaiter(name);
        }
    },
};

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
