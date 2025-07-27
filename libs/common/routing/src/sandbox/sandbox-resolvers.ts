import {
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { inject } from '@angular/core';
import { RoutingUtils } from '../utils';
import { map } from 'rxjs/operators';
import { AllocationRequest, CleanupRequest } from '@crczp/sandbox-model';
import { SandboxResolverHelperService } from './sandbox-resolver-helper.service';

export function resolveSandbox(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<UrlTree | AllocationRequest | CleanupRequest> {
    const service = inject(SandboxResolverHelperService);
    const sandboxId = RoutingUtils.extractVariable('sandboxInstanceId', route);

    function redirectToPool() {
        const poolId = RoutingUtils.extractVariable('poolId', route);
        if (poolId) {
            return service.getPoolDetailRedirect(+poolId);
        }
        return service.getPoolOverviewRedirect();
    }

    if (!sandboxId) {
        return of(redirectToPool());
    }

    return service
        .getSandboxRequest(route, state)
        .pipe(map((sandbox) => sandbox || redirectToPool()));
}

export function resolveSandboxBreadcrumb(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<string> {
    const service = inject(SandboxResolverHelperService);
    const requestType = RoutingUtils.containsSubroute(
        ':poolId/sandbox-instance/:sandboxInstanceId/cleanup',
        state
    )
        ? 'Allocation Request'
        : 'Cleanup Request';
    return service
        .getPool(route)
        .pipe(map((pool) => `${requestType} ${pool ? pool.id : ''}`));
}

export const SandboxResolvers = {
    resolveSandbox,
    resolveSandboxBreadcrumb,
};
