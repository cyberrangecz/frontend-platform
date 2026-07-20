import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformEventType } from '@crczp/visualization-model';
import { EventCacheDb } from '../cache/cache.interface';

/**
 * Central orchestrator for visualization components.
 *
 * Owns the Observable stream lifecycle — from scope signal to typed result
 * delivery. Delegates sync to CacheSyncService and cache queries to
 * CacheService.
 *
 * Entity resolution is NOT handled by the broker. A separate module resolves
 * entity ID fields into entity objects using Cashew for HTTP caching. Clients
 * call entity resolution directly after receiving query results.
 */
export abstract class DataBrokerService {
    /**
     * Single-cycle query: sync → query → emit → complete.
     *
     * On sync error: the observable errors and closes.
     * ErrorHandlerService is also notified.
     *
     * @param instanceId Scope signal — on change, previous stream is torn
     * down via switchMap and a new sync cycle begins for the new instance.
     * @param eventTypes Declared event types to sync before running the
     * query. Determines which cache tables are warmed. When pool-scoped
     * types (Command) are included, the broker resolves poolId internally.
     * @param queryFn Typed Drizzle query against the local event cache.
     * Receives the Drizzle async database with the full event schema loaded.
     * Only event tables are available — entity tables are not stored in
     * this cache.
     */
    abstract query<TResult>(
        instanceId: Signal<number>,
        eventTypes: PlatformEventType[],
        queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    ): Observable<TResult[]>;

    /**
     * Polling query: re-runs the query after each sync cycle, driven by one
     * shared per-instance sync driver that syncs the union of all readers'
     * event types on a timer at pollingPeriodShortMs from app config.
     *
     * The sync loop is resilient: a failed sync cycle does not terminate the
     * Observable. console.error is called and ErrorHandlerService is notified
     * once per outage (suppressed until a later cycle succeeds), the loop keeps
     * polling, and the query re-runs so the reader retains its last data. A
     * per-reader Cache query error still propagates to that reader only.
     *
     * The driver suspends its timer when no reader remains and resumes on the
     * next connection. The reader's subscription is released on unsubscribe or
     * scope change (switchMap).
     *
     * @param instanceId Scope signal — on change, the previous reader is
     * released via switchMap and the reader re-attaches to the new instance's
     * driver.
     * @param eventTypes Declared event types to sync before running the
     * query. Determines which cache tables are warmed. When pool-scoped
     * types (Command) are included, the driver resolves poolId internally.
     * @param queryFn Typed Drizzle query against the local event cache.
     * Receives the Drizzle async database with the full event schema loaded.
     * Only event tables are available — entity tables are not stored in
     * this cache.
     */
    abstract queryPolling<TResult>(
        instanceId: Signal<number>,
        eventTypes: PlatformEventType[],
        queryFn: (db: EventCacheDb) => Observable<TResult[]>,
    ): Observable<TResult[]>;
}
