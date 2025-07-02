import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, Router} from '@angular/router';
import {SandboxInstanceApi} from '@crczp/sandbox-api';
import {SandboxInstance} from '@crczp/sandbox-model';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, mergeMap, take} from 'rxjs/operators';
import {
    SANDBOX_INSTANCE_ID_SELECTOR,
    SANDBOX_POOL_ID_SELECTOR,
    SandboxErrorHandler,
    SandboxNavigator,
} from '@crczp/sandbox-agenda';

/**
 * Router data provider
 */
@Injectable()
export class SandboxInstanceResolver implements Resolve<SandboxInstance> {
    constructor(
        private api: SandboxInstanceApi,
        private errorHandler: SandboxErrorHandler,
        private navigator: SandboxNavigator,
        private router: Router,
    ) {}

    /**
     * Retrieves a specific resource based on id provided in url. Navigates to a resource overview if no resource with such id exists.
     * @param route route snapshot
     */
    resolve(route: ActivatedRouteSnapshot): Observable<SandboxInstance> | Promise<SandboxInstance> | SandboxInstance {
        if (!route.paramMap.has(SANDBOX_POOL_ID_SELECTOR)) {
            return this.navigateToPoolOverview();
        }
        const poolId = Number(route.paramMap.get(SANDBOX_POOL_ID_SELECTOR));
        if (!route.paramMap.has(SANDBOX_INSTANCE_ID_SELECTOR)) {
            return this.navigateToPool(poolId);
        }

        const sandboxUuid = route.paramMap.get(SANDBOX_INSTANCE_ID_SELECTOR);
        return this.api.getSandbox(sandboxUuid).pipe(
            take(1),
            mergeMap((sandbox) => (sandbox ? of(sandbox) : this.navigateToPool(poolId))),
            catchError((err) => {
                this.errorHandler.emit(err, 'Sandbox instance resolver');
                this.navigateToPool(poolId);
                return EMPTY;
            }),
        );
    }

    private navigateToPool(poolId: number): Observable<never> {
        this.router.navigate([this.navigator.toPool(poolId)]);
        return EMPTY;
    }

    private navigateToPoolOverview(): Observable<never> {
        this.router.navigate([this.navigator.toPoolOverview()]);
        return EMPTY;
    }
}
