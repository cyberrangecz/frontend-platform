import '@analogjs/vitest-angular/setup-zone';

import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { getTestBed } from '@angular/core/testing';

// Inject Node 22's native BroadcastChannel into the jsdom window so PGliteWorker
// can use it for cross-thread RPC. Node's BroadcastChannel works across worker_threads
// in the same process, which is exactly what @vitest/web-worker creates.
import { BroadcastChannel as NodeBroadcastChannel } from 'node:worker_threads';
if (typeof globalThis.BroadcastChannel === 'undefined') {
    (globalThis as any).BroadcastChannel = NodeBroadcastChannel;
}

// navigator.locks polyfill — PGliteWorker leader-election requires it; absent in jsdom 22
const _locksQueues = new Map<string, Promise<void>>();
(globalThis as any).navigator ??= {};
(navigator as any).locks ??= {
    async request<T>(_name: string, fn: () => Promise<T>): Promise<T> {
        const prev = _locksQueues.get(_name) ?? Promise.resolve();
        let release!: () => void;
        _locksQueues.set(_name, new Promise<void>(r => { release = r; }));
        await prev;
        try { return await fn(); } finally { release(); }
    },
};

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
