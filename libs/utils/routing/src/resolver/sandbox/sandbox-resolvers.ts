import {
    ActivatedRouteSnapshot,
    RedirectCommand,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { RoutingUtils } from '../../utils';
import { AllocationRequest, CleanupRequest } from '@crczp/sandbox-model';
import { SandboxResolverHelperService } from './sandbox-resolver-helper.service';
import { redirectWhenAbsent } from '../redirect-when-absent';

export function resolveSandbox(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
):
    | RedirectCommand
    | Observable<AllocationRequest | CleanupRequest | RedirectCommand> {
    const service = inject(SandboxResolverHelperService);
    const sandboxId = RoutingUtils.extractVariable('requestId', route);

    function poolRedirectUrl(): UrlTree {
        const poolId = RoutingUtils.extractVariable('poolId', route);
        if (poolId) {
            return service.poolDetailUrl(+poolId);
        }
        return service.poolOverviewUrl();
    }

    if (!sandboxId) {
        return new RedirectCommand(poolRedirectUrl());
    }

    return service
        .getSandboxRequest(route)
        .pipe(redirectWhenAbsent(poolRedirectUrl()));
}
