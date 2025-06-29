import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Request } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { POOL_ALLOCATION_REQUEST_PATH } from '@crczp/sandbox-agenda';
import { RequestResolver } from './request-resolver.service';

/**
 * Router breadcrumb title provider
 */
@Injectable()
export class RequestBreadcrumbResolver implements Resolve<string> {
    constructor(private poolRequestResolver: RequestResolver) {}

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        const resolved = this.poolRequestResolver.resolve(route, state) as Observable<Request>;
        const requestTypeName = state.url.includes(POOL_ALLOCATION_REQUEST_PATH)
            ? 'Allocation Request'
            : 'Cleanup Request';
        return resolved.pipe(map((poolRequest) => `${requestTypeName} ${poolRequest.id}`));
    }
}
