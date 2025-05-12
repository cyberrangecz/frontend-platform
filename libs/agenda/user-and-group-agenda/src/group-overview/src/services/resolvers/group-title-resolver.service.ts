import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Group } from '@crczp/user-and-group-model';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { GroupResolver } from './group-resolver.service';
import { GROUP_DETAIL_PATH, GROUP_EDIT_PATH, GROUP_NEW_PATH, GROUP_PATH, GROUP_SELECTOR } from '../../../../public';

@Injectable()
export class GroupTitleResolver {
    constructor(private groupResolver: GroupResolver) {
    }

    readonly CREATE_GROUP_TITLE = 'Create Group';

    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(`${GROUP_PATH}/${GROUP_NEW_PATH}`)) {
            return this.CREATE_GROUP_TITLE;
        } else if (route.paramMap.has(GROUP_SELECTOR)) {
            const resolved = this.groupResolver.resolve(route, state) as Observable<Group>;
            return resolved.pipe(
                take(1),
                map((group) => (group ? this.getTitleFromGroup(group, state) : '')),
                catchError(() => of(''))
            );
        }
        return '';
    }

    private getTitleFromGroup(group: Group, state: RouterStateSnapshot): string {
        if (state.url.includes(GROUP_EDIT_PATH)) {
            return `Edit ${group.name}`;
        }
        if (state.url.includes(GROUP_DETAIL_PATH)) {
            return `${group.name} Detail`;
        }
        return group.name;
    }
}
