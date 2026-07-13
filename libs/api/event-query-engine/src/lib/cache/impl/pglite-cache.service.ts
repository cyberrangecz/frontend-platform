import { inject, Injectable, InjectionToken } from '@angular/core';
import { PgliteDatabase } from 'drizzle-orm/pglite';
import { from, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { PortalConfig } from '@crczp/utils';
import { CacheService, EventCacheDb, RawEventRow, WatermarkEntry } from '../cache.interface';
import { initializeSchema } from './schema/schema-initializer';
import { insert } from './operator/insert-operator';
import { getWatermarks } from './operator/watermark-query-operator';
import { purge } from './operator/purge-operator';
import { evictStaleInstances } from './operator/eviction-operator';

/**
 * Injection token for the Drizzle database instance used by the event cache.
 * The app must provide this — typically by constructing a PGliteWorker, passing it
 * to drizzle(), and providing the resulting PgliteDatabase.
 */
export const EVENT_CACHE_DB = new InjectionToken<Promise<PgliteDatabase>>('EVENT_CACHE_DB');

@Injectable({ providedIn: 'root' })
export class PgliteCacheService implements CacheService {
    private db: (PgliteDatabase & EventCacheDb) | null = null;
    private readonly initPromise: Promise<void>;
    private readonly config = inject(PortalConfig);
    private readonly dbPromise = inject(EVENT_CACHE_DB);

    constructor() {
        this.initPromise = this.initializeDatabase();
    }

    private async initializeDatabase(): Promise<void> {
        const rawDb = await this.dbPromise;
        await initializeSchema(rawDb);
        this.db = rawDb as unknown as PgliteDatabase & EventCacheDb;
    }

    private async ensureInitialized(): Promise<void> {
        await this.initPromise;
        if (!this.db) throw new Error('Database initialization failed');
    }

    insert(rows: RawEventRow[]): Observable<void> {
        return from(this.ensureInitialized()).pipe(
            switchMap(() => from(insert(this.db!, rows))),
            catchError((err) => throwError(() => new Error(`Insert failed: ${err.message}`))),
        );
    }

    getWatermarks(instanceId: number, eventTypes: string[]): Observable<WatermarkEntry[]> {
        return from(this.ensureInitialized()).pipe(
            switchMap(() => from(getWatermarks(this.db!, instanceId, eventTypes))),
            catchError((err) => throwError(() => new Error(`Get watermarks failed: ${err.message}`))),
        );
    }

    query<TResult>(queryFn: (db: EventCacheDb) => Observable<TResult[]>): Observable<TResult[]> {
        return from(this.ensureInitialized()).pipe(
            switchMap(() => queryFn(this.db!)),
            catchError((err) => throwError(() => new Error(`Query failed: ${err.message}`))),
        );
    }

    purge(instanceId: number): Observable<void> {
        return from(this.ensureInitialized()).pipe(
            switchMap(() => from(purge(this.db!, instanceId))),
            catchError((err) => throwError(() => new Error(`Purge failed: ${err.message}`))),
        );
    }

    evictStaleInstances(): Observable<void> {
        return from(this.ensureInitialized()).pipe(
            switchMap(() => from(evictStaleInstances(this.db!, this.config))),
            catchError((err) => throwError(() => new Error(`Evict stale instances failed: ${err.message}`))),
        );
    }
}
