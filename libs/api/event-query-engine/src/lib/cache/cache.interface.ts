import { Observable } from 'rxjs';

/**
 * Opaque handle to the Drizzle async SQLite database with the full event schema loaded.
 *
 * Consumers receive this type only inside a CacheService.query callback — it is never
 * constructed or held directly. The concrete type is resolved by the cache implementation.
 */
declare const _cacheDbBrand: unique symbol;
export type EventCacheDb = { readonly [_cacheDbBrand]: void };

/**
 * Raw event row as returned by the Query Execution Layer.
 * Base fields are always present. Type-specific fields are carried in the same record and accessed
 * as unknown until narrowed by the consumer's query or schema.
 */
export interface RawEventRow {
    /** UUID. Omit to let the cache DB generate one via crypto.randomUUID(). */
    id?: string;
    /** Event class name. Determines which SQLite table the row is routed to. */
    type: string;
    /** Epoch milliseconds. Used for watermark tracking and delta sync. */
    timestamp: number;
    /** Scope key. All event tables carry this field. */
    instance_id: number;
    /** Sandbox identifier. Present on all event types. */
    sandbox_id: string;
    [field: string]: unknown;
}

/**
 * Watermark state for a single (instance, event type) pair.
 * Reflects the most recent successful sync for that combination.
 */
export interface WatermarkEntry {
    instanceId: number;
    eventType: string;
    /** Highest event timestamp successfully written in the last sync cycle for this type. */
    maxTimestamp: number;
    /** Wall-clock time (epoch ms) of the last successful insert call that touched this entry. */
    lastSynced: number;
}

/**
 * Persistent local state store for event data and watermarks.
 *
 * All methods return Observables that complete after emitting their result.
 *
 * Concurrency model:
 * - All operations are serialized by the PGlite WebWorker — no external locking needed.
 * - Callers may issue concurrent calls; the worker queues and executes them sequentially.
 *
 * Cache is passive — it never initiates operations. Eviction is triggered externally by bootstrap.
 *
 * Entity data is NOT stored in this cache. Entities are resolved by a separate module after query
 * execution, using Cashew for HTTP caching. Event rows contain entity ID fields (e.g.
 * training_definition_id, user_ref_id) that are resolved into entity objects outside this cache.
 */
export abstract class CacheService {
    /**
     * Accepts raw event rows for any mix of event types and persists them.
     *
     * Internally: routes rows to the per-type SQLite table; rows with a duplicate `id` are silently
     * ignored (deduplication at the primary key level); advances the watermark `max_timestamp` for
     * each type that received at least one new row; always updates `last_synced` for every type
     * present in the input, regardless of whether any rows were new.
     *
     * All operations are executed in a single worker transaction.
     * Watermarks are committed only on full success — a failure leaves previous state intact.
     */
    abstract insert(rows: RawEventRow[]): Observable<void>;

    /**
     * Returns the current watermark state for the given (instanceId, eventTypes) pairs.
     * Used by the Sync Module to determine cache freshness and compute `sinceTimestamp`.
     * Entries not yet present in the watermark table are absent from the result.
     */
    abstract getWatermarks(instanceId: number, eventTypes: string[]): Observable<WatermarkEntry[]>;

    /**
     * Executes a typed Drizzle query against the local SQLite database.
     * Only event tables are available — entity tables are not stored in this cache.
     * The `db` argument is the Drizzle async SQLite database with the full schema loaded.
     * Returns all matching rows, including those persisted in prior sessions.
     */
    abstract query<TResult>(queryFn: (db: EventCacheDb) => Observable<TResult[]>): Observable<TResult[]>;

    /**
     * Deletes all event rows and watermark entries scoped to the given instance.
     * After purge, the next Sync call for this instance will issue a full fetch.
     */
    abstract purge(instanceId: number): Observable<void>;

    /**
     * Enforces the 7-day TTL and max-size cap on instance event data.
     * Drops the least-recently-synced instance first (by `last_synced` watermark).
     * Called once by bootstrap on application init, before any instance is active.
     */
    abstract evictStaleInstances(): Observable<void>;
}
