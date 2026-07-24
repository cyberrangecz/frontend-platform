import { drizzle } from 'drizzle-orm/sqlite-proxy';

import { EventCacheDb } from '../cache/cache.interface';

/** Pending main-thread request awaiting its worker reply. */
interface PendingRequest {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
}

/** Tuning for {@link createSqliteEventDb}. */
export interface CreateSqliteEventDbOptions {
    /**
     * Gate deferring worker construction: the cache `Worker` is built only once this resolves, so a
     * tab that never resolves it never opens the single-connection database. Defaults to resolved
     * (the worker is built eagerly).
     */
    until?: Promise<unknown>;
}

/**
 * Bootstraps a SQLite event-cache database backed by a worker-hosted SAHPool engine, suitable for
 * passing to {@link provideEventBroker}.
 *
 * The caller must supply a factory that constructs the `Worker` **inline** using the pattern below,
 * so the bundler can statically detect the worker entry point and emit a separate worker chunk:
 *
 * ```ts
 * createSqliteEventDb(
 *   () => new Worker(new URL('./cache.worker.ts', import.meta.url), { type: 'module' })
 * )
 * ```
 *
 * Hoisting the `new Worker(new URL(...))` expression into a variable before returning it prevents
 * the bundler from detecting the worker, yielding a 404 for the worker script at runtime.
 *
 * The returned database is usable immediately; the worker applies the schema before answering the
 * first query, so callers need not await readiness separately.
 *
 * @param workerFactory Factory returning a freshly constructed cache `Worker`. The body must be
 *   `() => new Worker(new URL('./cache.worker.ts', import.meta.url), { type: 'module' })` verbatim
 *   at the application call site.
 * @param options Optional `until` gate deferring worker construction (see
 *   {@link CreateSqliteEventDbOptions}).
 * @returns Promise resolving to the Drizzle database bound to the cache worker.
 */
export function createSqliteEventDb(
    workerFactory: () => Worker,
    options: CreateSqliteEventDbOptions = {},
): Promise<EventCacheDb> {
    const pending = new Map<number, PendingRequest>();
    let nextRequestId = 0;

    const workerReady: Promise<Worker> = Promise.resolve(options.until).then(() => {
        const worker = workerFactory();
        worker.addEventListener('message', (event: MessageEvent) => {
            const { id, data, error } = event.data as { id: number; data?: unknown; error?: string };
            const request = pending.get(id);
            if (!request) return;
            pending.delete(id);
            if (error !== undefined) {
                request.reject(new Error(error));
            } else {
                request.resolve(data);
            }
        });
        return worker;
    });

    const send = (payload: Record<string, unknown>): Promise<unknown> =>
        new Promise((resolve, reject) => {
            const id = nextRequestId++;
            pending.set(id, { resolve, reject });
            workerReady.then((worker) => worker.postMessage({ id, ...payload }), reject);
        });

    const database = drizzle(
        async (sql, params, method) => {
            const rows = (await send({ type: 'exec', sql, params, method })) as unknown[];
            return { rows };
        },
        async (queries) => {
            const results = (await send({ type: 'batch', queries })) as { rows: unknown[] }[];
            return results;
        },
    );

    return Promise.resolve(database);
}
