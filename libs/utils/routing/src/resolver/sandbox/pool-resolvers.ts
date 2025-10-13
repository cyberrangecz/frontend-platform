import {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { RoutingUtils } from '../../utils';
import { Pool } from '@crczp/sandbox-model';
import { SandboxResolverHelperService } from './sandbox-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

function resolvePool(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<Pool | UrlTree> | UrlTree | null {
    if (RoutingUtils.containsSubroute('pool/create', state)) {
        return null;
    }

    const service = inject(SandboxResolverHelperService);

    if (RoutingUtils.hasVariable('poolId', route)) {
        return service
            .getPool(route)
            .pipe(
                catchUndefinedOrNull('Pool', () =>
                    service.navigateToPoolOverview()
                )
            );
    }
    return service.navigateToPoolOverview();
}

/**
 * Retrieves a breadcrumb title based on provided url
 * @param route route snapshot
 * @param state router state snapshot
 */
function resolvePoolComment(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
): Observable<string> {
    const service = inject(SandboxResolverHelperService);
    return service
        .getPool(route)
        .pipe(map((pool) => (pool && pool.comment ? pool.comment : '')));
}

/**
 * Retrieves a breadcrumb title based on provided url
 * @param route route snapshot
 * @param state router state snapshot
 */
function resolvePoolBreadcrumb(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<string> | string {
    if (RoutingUtils.containsSubroute('create', state)) {
        return 'Create';
    }
    const service = inject(SandboxResolverHelperService);
    return service
        .getPool(route)
        .pipe(map((pool) => (pool ? `Pool ${pool.id}` : '')));
}

export const PoolResolvers = {
    resolvePool: resolvePool,
    resolvePoolBreadcrumb: resolvePoolBreadcrumb,
    resolvePoolComment: resolvePoolComment,
};
