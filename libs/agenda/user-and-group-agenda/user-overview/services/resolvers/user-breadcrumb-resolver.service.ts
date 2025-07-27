import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { EMPTY, Observable, of } from 'rxjs';
import { User } from '@crczp/user-and-group-model';
import { catchError, map } from 'rxjs/operators';
import { UserResolverService } from './user-resolver.service';
import { Routing } from '@crczp/routing-commons';

@Injectable()
export class UserBreadcrumbResolverService {
    private userResolver = inject(UserResolverService);

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<string> | Promise<string> | string {
        if (route.paramMap.has(User.name)) {
            const resolved = this.userResolver.resolve(
                route,
                state
            ) as Observable<User>;
            return resolved.pipe(
                map((group) =>
                    group ? this.getBreadcrumbFromUser(group, route) : ''
                ),
                catchError(() => of(''))
            );
        }
        return EMPTY;
    }

    private getBreadcrumbFromUser(
        group: User,
        state: ActivatedRouteSnapshot
    ): string {
        if (Routing.Utils.hasVariable('groupId', state)) {
            return `${group.name} Detail`;
        }
        return group.name;
    }
}
