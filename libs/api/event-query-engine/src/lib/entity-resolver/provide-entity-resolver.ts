import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { EntityFetchApi } from './entity-fetch-api.service';
import { EntityResolverService } from './entity-resolver.service';
import { EntityFetchApiImpl } from './impl/entity-fetch-api-impl';
import { EntityResolverServiceImpl } from './impl/entity-resolver.service';

/**
 * Registers {@link EntityResolverService} and its default dependencies into
 * the current injector.
 *
 * Provides:
 * - `EntityResolverService` → {@link EntityResolverServiceImpl}
 * - `EntityFetchApi` → {@link EntityFetchApiImpl}
 *
 * Both are instantiated in the injector this is called from, so the training API
 * services {@link EntityFetchApiImpl} depends on need only be reachable from there.
 *
 * Call in `ApplicationConfig.providers`, an `NgModule`'s `providers`, a route's
 * `providers`, or a lazy environment injector that needs entity resolution.
 */
export function provideEntityResolverService(): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: EntityResolverService, useClass: EntityResolverServiceImpl },
        { provide: EntityFetchApi, useClass: EntityFetchApiImpl },
    ]);
}
