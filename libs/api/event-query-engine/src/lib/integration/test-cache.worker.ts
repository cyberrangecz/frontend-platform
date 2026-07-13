import { PGlite } from '@electric-sql/pglite';
import { worker } from '@electric-sql/pglite/worker';

// navigator.locks polyfill — PGliteWorker leader-election uses it; not available in Node worker_threads
const queues = new Map<string, Promise<void>>();
(globalThis as any).navigator ??= {};
(navigator as any).locks ??= {
    async request<T>(_name: string, fn: () => Promise<T>): Promise<T> {
        const prev = queues.get(_name) ?? Promise.resolve();
        let release!: () => void;
        queues.set(_name, new Promise<void>(r => { release = r; }));
        await prev;
        try { return await fn(); } finally { release(); }
    },
};

worker({
    async init() {
        return new PGlite();
    },
});
