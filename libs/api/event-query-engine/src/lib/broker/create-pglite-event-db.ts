import { PGliteWorker } from '@electric-sql/pglite/worker';
import { drizzle, PgliteDatabase } from 'drizzle-orm/pglite';

/**
 * Bootstraps a {@link PGliteWorker}-backed Drizzle database suitable for
 * passing to {@link provideEventBroker}.
 *
 * The caller owns the worker URL because `new URL('./cache.worker.ts',
 * import.meta.url)` only resolves against the bundler that owns the call
 * site — workers cannot be referenced from a library entry.
 *
 * @param workerUrl URL pointing at the application's cache worker entry,
 *   constructed via `new URL('./cache.worker.ts', import.meta.url)` in the
 *   app `main.ts`.
 * @returns Promise resolving to the Drizzle database bound to the worker.
 */
export function createPgliteEventDb(workerUrl: URL): Promise<PgliteDatabase> {
    const pg = new PGliteWorker(new Worker(workerUrl, { type: 'module' }));
    return pg.waitReady.then(() => drizzle({ client: pg as never }));
}
