import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';

import { EVENT_CACHE_DB, SqliteCacheService } from '../cache/impl/sqlite-cache.service';
import { CacheService, EventCacheDb } from '../cache/cache.interface';
import { CacheSyncService } from '../sync/sync.interface';
import { EventFetchApi } from '../sync/event-fetch-api';
import { SyncService } from '../sync/impl/sync.service';
import { EventFetchApiImpl } from '../sync/impl/event-fetch-api-impl';
import { DataBrokerService } from './broker.interface';
import { DataBrokerServiceImpl } from './impl/broker.service';
import { SyncDriverRegistry } from './impl/sync-driver-registry';

/**
 * Broker-layer providers, instantiated in the injector they are registered into.
 */
const DATA_BROKER_PROVIDERS: Provider[] = [
    SyncDriverRegistry,
    { provide: DataBrokerService, useClass: DataBrokerServiceImpl },
];

/**
 * Registers {@link DataBrokerService} and the sync-driver registry backing it into the
 * current injector.
 *
 * Both are instantiated in the injector this is called from, so the training API services
 * they depend on need only be reachable from there — the cache and sync layers they build
 * on stay wherever {@link provideEventBroker} registered them.
 *
 * Call in an `NgModule`'s `providers`, a route's `providers`, or any lazy environment
 * injector whose subtree reads the event cache.
 */
export function provideDataBroker(): EnvironmentProviders {
    return makeEnvironmentProviders(DATA_BROKER_PROVIDERS);
}

/**
 * Cache- and sync-layer providers, bound to the root-scoped singletons backing them.
 *
 * @param db Promise resolving to the Drizzle SQLite event-cache database instance.
 */
function eventCacheProviders(db: Promise<EventCacheDb>): Provider[] {
    return [
        { provide: EVENT_CACHE_DB, useValue: db },
        { provide: CacheService, useExisting: SqliteCacheService },
        { provide: CacheSyncService, useExisting: SyncService },
        { provide: EventFetchApi, useExisting: EventFetchApiImpl },
    ];
}

/**
 * Registers the event cache and its sync layer into the current injector, without the
 * broker layer.
 *
 * Provides:
 * - `EVENT_CACHE_DB` → the supplied {@link EventCacheDb} promise (required — construct via
 *   `createSqliteEventDb`)
 * - `CacheService` → {@link SqliteCacheService} (reuses the root-scoped singleton)
 * - `CacheSyncService` → {@link SyncService} (reuses the root-scoped singleton)
 * - `EventFetchApi` → {@link EventFetchApiImpl} (reuses the root-scoped singleton)
 *
 * Registers no dependency on the training API, so it resolves in an injector that cannot
 * reach it. Each subtree reading the cache registers its own broker via
 * {@link provideDataBroker}.
 *
 * @param db Promise resolving to the Drizzle SQLite event-cache database instance.
 */
export function provideEventCache(db: Promise<EventCacheDb>): EnvironmentProviders {
    return makeEnvironmentProviders(eventCacheProviders(db));
}

/**
 * Registers the event broker and its default dependencies into the current injector.
 *
 * Provides:
 * - everything {@link provideEventCache} registers
 * - everything {@link provideDataBroker} registers
 *
 * Call in a lazy environment injector that needs access to {@link DataBrokerService} and
 * can reach the training API services the broker depends on.
 *
 * @param db Promise resolving to the Drizzle SQLite event-cache database instance.
 */
export function provideEventBroker(db: Promise<EventCacheDb>): EnvironmentProviders {
    return makeEnvironmentProviders([
        ...eventCacheProviders(db),
        ...DATA_BROKER_PROVIDERS,
    ]);
}
