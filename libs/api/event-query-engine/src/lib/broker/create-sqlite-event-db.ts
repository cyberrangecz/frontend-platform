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
    let workerFailure: Error | null = null;

    const failWorker = (error: Error): void => {
        workerFailure = error;
        for (const request of pending.values()) {
            request.reject(error);
        }
        pending.clear();
    };

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
        worker.addEventListener('error', (event: ErrorEvent) =>
            failWorker(
                new Error(
                    `Event cache worker failed to run: ${event.message || 'no details available'}`,
                ),
            ),
        );
        worker.addEventListener('messageerror', () =>
            failWorker(new Error('Event cache worker sent a message that could not be read.')),
        );
        releaseWorkerOnUnload(worker);
        return worker;
    });

    const send = (payload: Record<string, unknown>): Promise<unknown> =>
        new Promise((resolve, reject) => {
            if (workerFailure) {
                reject(workerFailure);
                return;
            }
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

/**
 * Instructs the worker to close the database and hand back its OPFS access handles when the page
 * goes away for good.
 *
 * Each pool file is held under an exclusive OPFS access handle, so a page that leaves without
 * releasing them makes the next page contend with handles no live document owns. Pages kept alive
 * in the back/forward cache are left untouched, since they resume against this same worker.
 *
 * @param worker Cache worker owning the database connection.
 */
function releaseWorkerOnUnload(worker: Worker): void {
    if (typeof globalThis.addEventListener !== 'function') return;
    globalThis.addEventListener('pagehide', (event: Event) => {
        if ((event as PageTransitionEvent).persisted) return;
        worker.postMessage({ type: 'release' });
    });
}
