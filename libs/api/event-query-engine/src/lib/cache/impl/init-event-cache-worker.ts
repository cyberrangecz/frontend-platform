/// <reference lib="webworker" />

import { IdbFs, PGlite } from '@electric-sql/pglite';
import { worker } from '@electric-sql/pglite/worker';

/**
 * Options accepted by {@link initEventCacheWorker}.
 */
export interface EventCacheWorkerOptions {
    /**
     * IndexedDB database name backing the cache. Defaults to
     * `event-cache-v1`. Set per-app when isolation between deployments is
     * required (e.g. harness vs. production).
     */
    dbName?: string;
    /**
     * URL the worker fetches `pglite.wasm` from. Defaults to `/pglite.wasm`
     * (root-relative), matching the asset wiring used by all CRCZP apps.
     */
    pgliteWasmUrl?: string;
    /**
     * URL the worker fetches `initdb.wasm` from. Defaults to `/initdb.wasm`.
     */
    initdbWasmUrl?: string;
}

/**
 * Boots the PGlite event-cache worker. Call once from each app's worker
 * entry (`cache.worker.ts`) — the body must live in the app because Nx
 * requires `new URL('./cache.worker.ts', import.meta.url)` to resolve
 * relative to the app bundle.
 *
 * @param options Override database name or wasm URLs. All fields optional.
 */
export function initEventCacheWorker(options: EventCacheWorkerOptions = {}): void {
    const {
        dbName = 'event-cache-v1',
        pgliteWasmUrl = '/pglite.wasm',
        initdbWasmUrl = '/initdb.wasm',
    } = options;

    worker({
        async init() {
            const [pgliteWasmModule, initdbWasmModule] = await Promise.all([
                WebAssembly.compileStreaming(fetch(pgliteWasmUrl)),
                WebAssembly.compileStreaming(fetch(initdbWasmUrl)),
            ]);
            return new PGlite({
                fs: new IdbFs(dbName),
                relaxedDurability: true,
                pgliteWasmModule,
                initdbWasmModule,
            });
        },
    });
}
