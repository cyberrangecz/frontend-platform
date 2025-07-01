import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { SUMMARY_PATH } from '@crczp/training-agenda';

/**
 * Router breadcrumb title resolver
 */
@Injectable()
export class AdaptiveDefinitionDetailBreadcrumbResolver {
    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.includes(SUMMARY_PATH)) {
            return 'Summary';
        }
        return '';
    }
}
