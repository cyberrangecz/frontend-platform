import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { inject } from '@angular/core';
import { RoutingUtils } from '../../utils';
import { map } from 'rxjs/operators';
import { AllocationRequest, CleanupRequest } from '@crczp/sandbox-model';
import { SandboxResolverHelperService } from './sandbox-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

export function resolveSandbox(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Observable<never | AllocationRequest | CleanupRequest> {
    const service = inject(SandboxResolverHelperService);
    const sandboxId = RoutingUtils.extractVariable('requestId', route);

    function redirectToPool() {
        const poolId = RoutingUtils.extractVariable('poolId', route);
        if (poolId) {
            return service.navigateToPoolDetail(+poolId);
        }
        return service.navigateToPoolOverview();
    }

    if (!sandboxId) {
        return redirectToPool();
    }

    return service
        .getSandboxRequest(route)
        .pipe(catchUndefinedOrNull('Sandbox', () => redirectToPool()));
}

export function resolveSandboxBreadcrumb(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Observable<string> {
    if (RoutingUtils.containsSubroute('topology', state)) {
        return of('Topology');
    }
    const service = inject(SandboxResolverHelperService);

    return service
        .getPool(route)
        .pipe(map((pool) => `'Allocation Request' ${pool ? pool.id : ''}`));
}

export const SandboxResolvers = {
    resolveSandbox,
    resolveSandboxBreadcrumb,
};
