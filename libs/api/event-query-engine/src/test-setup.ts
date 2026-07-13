import '@analogjs/vitest-angular/setup-zone';

import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { getTestBed } from '@angular/core/testing';

// jsdom 22 provides its own BroadcastChannel scoped to the DOM context; it cannot
// communicate with Node worker_threads. PGliteWorker leader election uses
// BroadcastChannel across threads, so we must unconditionally replace jsdom's
// implementation with the Node-native one.
import { BroadcastChannel as NodeBroadcastChannel } from 'node:worker_threads';
(globalThis as any).BroadcastChannel = NodeBroadcastChannel;

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
