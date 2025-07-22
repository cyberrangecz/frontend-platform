import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {Observable, of} from "rxjs";
import {AllocationRequest, CleanupRequest, Pool} from "@crczp/sandbox-model";
import {inject} from "@angular/core";
import {AllocationRequestsApi, CleanupRequestsApi, PoolApi} from "@crczp/sandbox-api";
import {RoutingUtils} from "../../utils";
import {catchError, map, take} from "rxjs/operators";
import {Routing} from "../../routing-namespace";
import {ErrorHandlerService} from "../../../error-handling/error-handler.service";

export namespace SandboxResolvers {

    function getPoolOverviewRedirect(): UrlTree {
        return inject(Router).createUrlTree([Routing.RouteBuilder.pool.build()]);
    }

    function getPoolDetailRedirect(poolId: number): UrlTree {
        return inject(Router).createUrlTree([Routing.RouteBuilder.pool.poolId(poolId).build()]);
    }

    function getPool(route: ActivatedRouteSnapshot): Observable<Pool | null> {
        const poolId = RoutingUtils.extractVariable('poolId', route)
        if (!poolId) {
            return of(null);
        }
        return inject(PoolApi).getPool(+poolId).pipe(
            take(1),
            catchError(err => {
                inject(ErrorHandlerService).emit(err, 'Resolving sandbox');
                return of(null);
            })
        )
    }

    function getSandbox(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<AllocationRequest | CleanupRequest | null> {
        const sandboxId = RoutingUtils.extractVariable('sandboxInstanceId', route);

        const api = inject(RoutingUtils.containsSubroute('cleanup', state) ?
            CleanupRequestsApi : AllocationRequestsApi);

        if (!sandboxId) {
            return of(null);
        }
        return api.get(+sandboxId).pipe(
            take(1),
        );
    }

    export function resolveSandbox(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<UrlTree | AllocationRequest | CleanupRequest> {
        const sandboxId = RoutingUtils.extractVariable('sandboxInstanceId', route);

        function redirectToPool() {
            const poolId = RoutingUtils.extractVariable('poolId', route);
            if (poolId) {
                return getPoolDetailRedirect(+poolId);
            }
            return getPoolOverviewRedirect();
        }

        if (!sandboxId) {
            return of(redirectToPool());
        }

        return getSandbox(route, state).pipe(
            map((sandbox) => sandbox || redirectToPool())
        )
    }

    export function resolveSandboxBreadcrumb(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> {
        const requestType = RoutingUtils.containsSubroute(':poolId/sandbox-instance/:sandboxInstanceId/cleanup', state) ?
            'Allocation Request' : 'Cleanup Request';
        return getPool(route).pipe(
            map((pool) => `${requestType} ${pool ? pool.id : ''}`),
        )
    }

}
