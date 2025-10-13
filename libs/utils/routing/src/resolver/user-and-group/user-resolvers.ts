import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, take } from 'rxjs/operators';
import { inject } from '@angular/core';
import { User } from '@crczp/user-and-group-model';
import { Routing } from '../../routing-namespace';
import { UserAndGroupResolverHelperService } from './user-and-group-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

function resolveUser(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
): Observable<User> {
    const userId = Routing.Utils.extractVariable<'user'>('userId', route);
    const service = inject(UserAndGroupResolverHelperService);
    if (!userId) {
        return service.navigateToUserOverview();
    }
    return service
        .getUser(userId)
        .pipe(
            catchUndefinedOrNull('User', () => service.navigateToUserOverview())
        );
}

/**
 * Retrieves a specific resource title based on id provided in url
 * @param route route snapshot
 * @param state router state snapshot
 */
function resolveUserTitle(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
): Observable<string> | string {
    const userId = Routing.Utils.extractVariable<'user'>('userId', route);
    if (!userId) return 'User Detail';
    const service = inject(UserAndGroupResolverHelperService);

    return service.getUser(userId).pipe(
        take(1),
        map((user) => (user ? `${user.name} Detail` : 'User Detail')),
        catchError(() => of(''))
    );
}

export const UserResolvers = {
    resolveUser,
    resolveUserTitle,
};
