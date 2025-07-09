import { Injectable, inject } from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {EMPTY, Observable, of} from 'rxjs';
import {User} from '@crczp/user-and-group-model';
import {catchError, map} from 'rxjs/operators';
import {UserResolverService} from './user-resolver.service';
import {USER_DETAIL_PATH, USER_SELECTOR} from "@crczp/user-and-group-agenda";

@Injectable()
export class UserBreadcrumbResolverService {
    private userResolver = inject(UserResolverService);


    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (route.paramMap.has(USER_SELECTOR)) {
            const resolved = this.userResolver.resolve(route, state) as Observable<User>;
            return resolved.pipe(
                map((group) => (group ? this.getBreadcrumbFromUser(group, state) : '')),
                catchError(() => of(''))
            );
        }
        return EMPTY;
    }

    private getBreadcrumbFromUser(group: User, state: RouterStateSnapshot): string {
        if (state.url.includes(USER_DETAIL_PATH)) {
            return `${group.name} Detail`;
        }
        return group.name;
    }
}
