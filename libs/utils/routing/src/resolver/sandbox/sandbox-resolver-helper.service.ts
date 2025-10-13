import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AllocationRequestsApi, CleanupRequestsApi, PoolApi, SandboxDefinitionApi } from '@crczp/sandbox-api';
import { Routing } from '../../routing-namespace';
import { Observable, of } from 'rxjs';
import { RoutingUtils } from '../../utils';
import { catchError, take } from 'rxjs/operators';
import { AllocationRequest, CleanupRequest, Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { CommonResolverHelperService } from '../common-resolver-helper-service';

@Injectable({
    providedIn: 'root',
})
export class SandboxResolverHelperService extends CommonResolverHelperService {
    private readonly definitionApi = inject(SandboxDefinitionApi);
    private readonly poolApi = inject(PoolApi);
    private readonly cleanupApi = inject(CleanupRequestsApi);
    private readonly allocationApi = inject(AllocationRequestsApi);

    constructor() {
        super(inject(ErrorHandlerService), inject(Router));
    }

    public navigateToPoolOverview() {
        return this.navigate(
            this.router.createUrlTree([Routing.RouteBuilder.pool.build()])
        );
    }

    public navigateToPoolDetail(poolId: number) {
        return this.navigate(
            this.router.createUrlTree([
                Routing.RouteBuilder.pool.poolId(poolId).build(),
            ])
        );
    }

    public navigateToSandboxDefinitionOverview() {
        return this.navigate(
            this.router.createUrlTree([
                Routing.RouteBuilder.sandbox_definition.build(),
            ])
        );
    }

    public navigateToCreatePool() {
        return this.navigate(
            this.router.createUrlTree([
                Routing.RouteBuilder.pool.create.build(),
            ])
        );
    }

    public getPool(route: ActivatedRouteSnapshot): Observable<Pool | null> {
        const poolId = this.extractPoolId(route);
        if (!poolId) {
            this.emitFrontendError('No pool id found in route');
            return of(null);
        }
        return this.poolApi.getPool(+poolId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Resolving sandbox');
                return of(null);
            })
        );
    }

    public getSandboxDefinition(
        route: ActivatedRouteSnapshot
    ): Observable<SandboxDefinition | null> {
        const definitionId = this.extractDefinitionId(route);
        if (!definitionId) {
            this.emitFrontendError('No group id found in route');
            return of(null);
        }

        return this.definitionApi.get(+definitionId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Resolving sandbox definition');
                return of(null);
            })
        );
    }

    public getSandboxRequest(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<AllocationRequest | CleanupRequest | null> {
        const sandboxRequestId = this.extractSandboxRequestId(route);
        const api = RoutingUtils.containsSubroute('cleanup', state)
            ? this.cleanupApi
            : this.allocationApi;

        if (!sandboxRequestId) {
            this.emitFrontendError('No allocation request id found in route');
            return of(null);
        }
        return api.get(+sandboxRequestId).pipe(take(1));
    }

    private extractPoolId(route: ActivatedRouteSnapshot): number | null {
        const poolId = RoutingUtils.extractVariable('poolId', route);
        return poolId && !isNaN(+poolId) ? +poolId : null;
    }

    private extractDefinitionId(route: ActivatedRouteSnapshot): number | null {
        const definitionId = RoutingUtils.extractVariable(
            'definitionId',
            route
        );
        return definitionId && !isNaN(+definitionId) ? +definitionId : null;
    }

    private extractSandboxRequestId(
        route: ActivatedRouteSnapshot
    ): number | null {
        const sandboxRequestId = RoutingUtils.extractVariable(
            'requestId',
            route
        );
        return sandboxRequestId && !isNaN(+sandboxRequestId)
            ? +sandboxRequestId
            : null;
    }
}
