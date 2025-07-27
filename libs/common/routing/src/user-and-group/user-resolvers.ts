import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { UserApi } from '@crczp/user-and-group-api';
import { User } from '@crczp/user-and-group-model';
import { Routing } from '../routing-namespace';

function navigateToUserOverview(): UrlTree {
    return inject(Router).parseUrl(Routing.RouteBuilder.user.build());
}

function getUserFromUserId(userId: string): Observable<User | undefined> {
    const id = Number(userId);
    return inject(UserApi)
        .get(id)
        .pipe(
            take(1),
            catchError((err) => {
                inject(ErrorHandlerService).emit(
                    err,
                    'Resolving user from path'
                );
                return of(undefined);
            })
        );
}

function resolveUser(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<User | UrlTree> | UrlTree {
    const userId = Routing.Utils.extractVariable<'user'>('userId', route);
    if (!userId) return navigateToUserOverview();

    return getUserFromUserId(userId).pipe(
        map((user) => (user ? user : navigateToUserOverview()))
    );
}

/**
 * Retrieves a specific resource title based on id provided in url
 * @param route route snapshot
 * @param state router state snapshot
 */
function resolveUserTitle(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<string> | string {
    const userId = Routing.Utils.extractVariable<'user'>('userId', route);
    if (!userId) return 'User Detail';

    return getUserFromUserId(userId).pipe(
        take(1),
        map((user) => (user ? `${user.name} Detail` : 'User Detail')),
        catchError(() => of(''))
    );
}

export const UserResolvers = {
    resolveUser,
    resolveUserTitle,
};
