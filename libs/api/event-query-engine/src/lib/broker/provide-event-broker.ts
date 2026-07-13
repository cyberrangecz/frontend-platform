import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { PgliteDatabase } from 'drizzle-orm/pglite';

import { EVENT_CACHE_DB, PgliteCacheService } from '../cache/impl/pglite-cache.service';
import { CacheService } from '../cache/cache.interface';
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
 * - `EVENT_CACHE_DB` → the supplied {@link PgliteDatabase} promise (required — construct via
 *   `PGliteWorker` and pass the resolved `drizzle()` instance)
 * - `CacheService` → {@link PgliteCacheService} (reuses the root-scoped singleton)
 * - `DataBrokerService` → {@link DataBrokerServiceImpl} (reuses the root-scoped singleton)
 * - `CacheSyncService` → {@link SyncService} (reuses the root-scoped singleton)
 * - `EventFetchApi` → {@link EventFetchApiImpl} (reuses the root-scoped singleton)
 *
 * Call in `ApplicationConfig.providers` or a lazy environment injector that
 * needs access to {@link DataBrokerService}.
 *
 * @param db Promise resolving to the Drizzle PGlite database instance.
 */
export function provideEventBroker(db: Promise<PgliteDatabase>): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: EVENT_CACHE_DB, useValue: db },
        { provide: CacheService, useExisting: PgliteCacheService },
        { provide: DataBrokerService, useExisting: DataBrokerServiceImpl },
        { provide: CacheSyncService, useExisting: SyncService },
        { provide: EventFetchApi, useExisting: EventFetchApiImpl },
    ]);
}
