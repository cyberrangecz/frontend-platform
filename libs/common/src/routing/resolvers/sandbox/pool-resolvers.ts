import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {Observable, of} from "rxjs";
import {Pool} from "@crczp/sandbox-model";
import {inject} from "@angular/core";
import {PoolApi} from "@crczp/sandbox-api";
import {RoutingUtils} from "../../utils";
import {catchError, map, take} from "rxjs/operators";
import {Routing} from "../../routing-namespace";
import {ErrorHandlerService} from "../../../error-handling/error-handler.service";

export namespace PoolResolvers {

    function getPoolOverviewRedirect(): UrlTree {
        return inject(Router).createUrlTree([Routing.RouteBuilder.pool.build()]);
    }

    function getCreatePoolRedirect(): UrlTree {
        return inject(Router).createUrlTree([Routing.RouteBuilder.pool.create.build()]);
    }

    function getPool(route: ActivatedRouteSnapshot): Observable<Pool | null> {
        const poolId = RoutingUtils.extractVariable('poolId', route)
        if (!poolId) {
            return of(null);
        }
        return inject(PoolApi).getPool(+poolId).pipe(
            take(1),
            catchError(err => {
                inject(ErrorHandlerService).emit(err, 'Resolving pool');
                return of(null);
            })
        )
    }

    export function resolvePool(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Pool | UrlTree> | UrlTree | null {
        if (RoutingUtils.containsSubroute('pool/create', state)) {
            return null;
        }
        if (RoutingUtils.hasVariable('poolId', route)) {
            return getPool(route).pipe(
                map((pool) => pool || getCreatePoolRedirect()),
                catchError((err) => {
                    inject(ErrorHandlerService).emit(err, 'Resolving pool');
                    return of(getCreatePoolRedirect())
                }),
            );
        }
        return getPoolOverviewRedirect()
    }

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    export function resolvePoolComment(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> {
        return (getPool(route)).pipe(
            map((pool) => pool && pool.comment ? pool.comment : ''),
        );
    }

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    export function resolvePoolBreadcrumb(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | string {
        if (RoutingUtils.containsSubroute('create', state)) {
            return 'Create';
        }
        return getPool(route).pipe(map((pool) => pool ? `Pool ${pool.id}` : ''));
    }


}
