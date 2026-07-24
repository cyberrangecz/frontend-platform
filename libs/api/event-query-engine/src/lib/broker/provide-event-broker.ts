import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { EVENT_CACHE_DB, SqliteCacheService } from '../cache/impl/sqlite-cache.service';
import { CacheService, EventCacheDb } from '../cache/cache.interface';
import { CacheSyncService } from '../sync/sync.interface';
import { EventFetchApi } from '../sync/event-fetch-api';
import { SyncService } from '../sync/impl/sync.service';
import { EventFetchApiImpl } from '../sync/impl/event-fetch-api-impl';
import { DataBrokerService } from './broker.interface';
import { DataBrokerServiceImpl } from './impl/broker.service';

/**
 * Registers the event broker and its default dependencies into the current injector.
 *
 * Provides:
 * - `EVENT_CACHE_DB` → the supplied {@link EventCacheDb} promise (required — construct via
 *   `createSqliteEventDb`)
 * - `CacheService` → {@link SqliteCacheService} (reuses the root-scoped singleton)
 * - `DataBrokerService` → {@link DataBrokerServiceImpl} (reuses the root-scoped singleton)
 * - `CacheSyncService` → {@link SyncService} (reuses the root-scoped singleton)
 * - `EventFetchApi` → {@link EventFetchApiImpl} (reuses the root-scoped singleton)
 *
 * Call in `ApplicationConfig.providers` or a lazy environment injector that
 * needs access to {@link DataBrokerService}.
 *
 * @param db Promise resolving to the Drizzle SQLite event-cache database instance.
 */
export function provideEventBroker(db: Promise<EventCacheDb>): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: EVENT_CACHE_DB, useValue: db },
        { provide: CacheService, useExisting: SqliteCacheService },
        { provide: DataBrokerService, useExisting: DataBrokerServiceImpl },
        { provide: CacheSyncService, useExisting: SyncService },
        { provide: EventFetchApi, useExisting: EventFetchApiImpl },
    ]);
}
