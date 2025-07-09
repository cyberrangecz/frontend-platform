import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, RouterStateSnapshot} from '@angular/router';
import {Pool} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {PoolResolver} from './pool-resolver.service';

/**
 * Router breadcrumb title provider
 */
@Injectable()
export class PoolCommentResolver implements Resolve<string> {
    private poolResolver = inject(PoolResolver);


    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        return (this.poolResolver.resolve(route, state) as Observable<Pool>).pipe(
            map((pool) => `${pool.comment === undefined ? '' : pool.comment}`),
        );
    }
}
