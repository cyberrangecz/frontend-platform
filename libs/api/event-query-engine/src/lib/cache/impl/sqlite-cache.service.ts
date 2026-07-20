import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { PortalConfig } from '@crczp/utils';
import { CacheService, EventCacheDb, RawEventRow, WatermarkEntry } from '../cache.interface';
import { insert } from './operator/insert-operator';
import { getWatermarks } from './operator/watermark-query-operator';
import { purge } from './operator/purge-operator';
import { evictStaleInstances } from './operator/eviction-operator';

/**
 * Injection token for the event-cache Drizzle database. The app provides this — typically the
 * resolved handle from `createSqliteEventDb`. The worker applies the schema before serving queries.
 */
export const EVENT_CACHE_DB = new InjectionToken<Promise<EventCacheDb>>('EVENT_CACHE_DB');

/**
 * SQLite-backed implementation of {@link CacheService}. Every operation flows through a single
 * runner that resolves the database handle, projects the operation, and normalizes failures.
 */
@Injectable({ providedIn: 'root' })
export class SqliteCacheService implements CacheService {
    private readonly config = inject(PortalConfig);
    private readonly databaseReady = inject(EVENT_CACHE_DB);

    insert(rows: RawEventRow[]): Observable<void> {
        return this.run('Insert', (db) => from(insert(db, rows)));
    }

    getWatermarks(instanceId: number, eventTypes: string[]): Observable<WatermarkEntry[]> {
        return this.run('Get watermarks', (db) => from(getWatermarks(db, instanceId, eventTypes)));
    }

    query<TResult>(queryFn: (db: EventCacheDb) => Observable<TResult[]>): Observable<TResult[]> {
        return this.run('Query', queryFn);
    }

    purge(instanceId: number): Observable<void> {
        return this.run('Purge', (db) => from(purge(db, instanceId)));
    }

    evictStaleInstances(): Observable<void> {
        return this.run('Evict stale instances', (db) => from(evictStaleInstances(db, this.config)));
    }

    /**
     * Resolves the database handle, applies the projection, and rewraps any failure with a labeled
     * message.
     *
     * @param label Operation name used in error messages.
     * @param project Projection issuing the operation against the ready database.
     * @returns Observable mirroring the projection's result.
     */
    private run<TResult>(
        label: string,
        project: (db: EventCacheDb) => Observable<TResult>,
    ): Observable<TResult> {
        return from(this.databaseReady).pipe(
            switchMap(project),
            catchError((error: Error) =>
                throwError(() => new Error(`${label} failed: ${error.message}`)),
            ),
        );
    }
}
