import { Observable } from 'rxjs';
import { SyncParams } from './sync-params.interface';
import { SyncTableComplete } from './sync-result.interface';

/**
 * Orchestrates a single sync cycle for a given training instance.
 *
 * Lifecycle:
 * 1. Check watermark freshness for each declared event type.
 *    If every type is fresh (last_synced within 1 second), emit
 *    SyncTableComplete for each and complete without fetching.
 * 2. Fetch events from the microservice for all declared event types
 *    in a single call, passing sinceTimestamp derived from watermarks.
 * 3. Insert fetched rows into the cache. The single cache worker serializes
 *    concurrent writes — no external locking needed.
 * 4. Emit SyncTableComplete per event type, then complete.
 *
 * Error model — all-or-nothing:
 * Any error terminates the Observable immediately. No partial emissions
 * are produced for the current sync cycle. Consumers never operate on
 * incomplete data. Errors are forwarded to the caller for logging and
 * user notification.
 *
 * Entity resolution is NOT Sync's responsibility. A separate entity
 * resolution module handles resolving entity ID fields into entity
 * objects after query execution, using Cashew for HTTP caching. Clients
 * call entity resolution directly — it is optional and configurable.
 */
export abstract class CacheSyncService {
    /**
     * Execute a sync cycle for the given instance and declared event types.
     *
     * @returns An Observable that emits one SyncTableComplete per event
     * type, then completes. Errors terminate the stream immediately.
     */
    abstract sync(params: SyncParams): Observable<SyncTableComplete>;
}
