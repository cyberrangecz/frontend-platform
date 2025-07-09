import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot} from '@angular/router';
import {PoolApi} from '@crczp/sandbox-api';
import {Pool} from '@crczp/sandbox-model';
import {BehaviorSubject, EMPTY, Observable, of} from 'rxjs';
import {catchError, mergeMap, take} from 'rxjs/operators';
import {
    SANDBOX_POOL_ID_SELECTOR,
    SANDBOX_POOL_NEW_PATH,
    SANDBOX_POOL_PATH,
    SandboxErrorHandler,
    SandboxNavigator,
} from '@crczp/sandbox-agenda';

/**
 * Router data provider
 */
@Injectable()
export class PoolResolver implements Resolve<Pool> {
    private api = inject(PoolApi);
    private errorHandler = inject(SandboxErrorHandler);
    private navigator = inject(SandboxNavigator);
    private router = inject(Router);


    private poolSubject$: BehaviorSubject<Pool> = new BehaviorSubject(null);
    pool$: Observable<Pool> = this.poolSubject$.asObservable();

    /**
     * Retrieves a specific resource based on id provided in url. Navigates to a resource overview if no resource with such id exists.
     * Stores resource after first invocation and resets it after second.
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Pool> | Promise<Pool> | Pool {
        if (state.url.endsWith(`${SANDBOX_POOL_PATH}/${SANDBOX_POOL_NEW_PATH}`)) {
            return null;
        }
        if (route.paramMap.has(SANDBOX_POOL_ID_SELECTOR)) {
            const id = Number(route.paramMap.get(SANDBOX_POOL_ID_SELECTOR));
            return this.api.getPool(id).pipe(
                take(1),
                mergeMap((pool) => (pool ? of(pool) : this.navigateToNew())),
                catchError((err) => {
                    this.errorHandler.emit(err, 'Resolving pool');
                    return this.navigateToNew();
                }),
            );
        }
        return this.navigateToOverview();
    }

    private navigateToOverview(): Observable<never> {
        this.router.navigate([this.navigator.toPoolOverview()]);
        return EMPTY;
    }

    private navigateToNew(): Observable<never> {
        this.router.navigate([this.navigator.toCreatePool()]);
        return EMPTY;
    }
}
