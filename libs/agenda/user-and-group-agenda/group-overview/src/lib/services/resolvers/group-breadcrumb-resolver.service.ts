/**
 * Router breadcrumb title provider
 */
import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {Group} from '@crczp/user-and-group-model';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {GROUP_DETAIL_PATH, GROUP_EDIT_PATH, GROUP_NEW_PATH, GROUP_SELECTOR} from '@crczp/user-and-group-agenda';
import {GroupResolver} from './group-resolver.service';

@Injectable()
export class GroupBreadcrumbResolver {
    readonly CREATE_GROUP_BREADCRUMB = 'Create';

    constructor(private groupResolver: GroupResolver) {
    }

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(GROUP_NEW_PATH)) {
            return this.CREATE_GROUP_BREADCRUMB;
        } else if (route.paramMap.has(GROUP_SELECTOR)) {
            const resolved = this.groupResolver.resolve(route, state) as Observable<Group>;
            return resolved.pipe(
                map((group) => (group ? this.getBreadcrumbFromGroup(group, state) : '')),
                catchError(() => of(''))
            );
        }
        return EMPTY;
    }

    private getBreadcrumbFromGroup(group: Group, state: RouterStateSnapshot): string {
        if (state.url.includes(GROUP_EDIT_PATH)) {
            return `Edit ${group.name}`;
        }
        if (state.url.includes(GROUP_DETAIL_PATH)) {
            return `${group.name} Detail`;
        }
        return group.name;
    }
}
