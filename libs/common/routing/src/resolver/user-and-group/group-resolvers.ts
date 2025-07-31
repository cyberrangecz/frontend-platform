import { catchError, map, take } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Routing } from '../../routing-namespace';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Group } from '@crczp/user-and-group-model';
import { inject } from '@angular/core';
import { UserAndGroupResolverHelperService } from './user-and-group-resolver-helper.service';
import { catchUndefinedOrNull } from '../catch-undefined-or-null';

function resolveGroup(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<Group | never> | null {
    if (Routing.Utils.containsSubroute('group/create', state)) {
        return null;
    }
    const service = inject(UserAndGroupResolverHelperService);
    return service
        .getGroup(route)
        .pipe(
            catchUndefinedOrNull('Group', () => service.navigateToNewGroup())
        );
}

/**
 * Retrieves a specific resource title based on id provided in url
 * @param route route snapshot
 * @param state router state snapshot
 */
function resolveGroupTitle(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<string> | string {
    if (Routing.Utils.containsSubroute('group/create', state)) {
        return 'Create Group';
    }

    function getTitle(group: Group | null): string {
        if (Routing.Utils.containsSubroute('group/:groupId/edit', state)) {
            return group ? `Edit ${group.name}` : 'Edit Group';
        }
        if (Routing.Utils.containsSubroute('group/:groupId', state)) {
            return group ? `Detail of ${group.name}` : 'Group Detail';
        }
        return group ? group.name : 'Group';
    }

    const service = inject(UserAndGroupResolverHelperService);

    return service.getGroup(route).pipe(
        take(1),
        map((group) => getTitle(group)),
        catchError(() => of(''))
    );
}

function resolveGroupBreadcrumb(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
): Observable<string> | string {
    if (Routing.Utils.containsSubroute('group/create', state)) {
        return 'Create';
    }

    function getBreadcrumb(group: Group | null): string {
        if (Routing.Utils.containsSubroute('group/:groupId/edit', state)) {
            return group ? `Edit ${group.name}` : 'Edit Group';
        }
        if (Routing.Utils.containsSubroute('group/:groupId', state)) {
            return group ? `${group.name} Detail` : 'Group Detail';
        }
        return group ? group.name : 'Group';
    }

    const service = inject(UserAndGroupResolverHelperService);

    return service.getGroup(route).pipe(
        map((group) => getBreadcrumb(group)),
        catchError(() => of(''))
    );
}

export const GroupResolvers = {
    resolveGroup,
    resolveGroupTitle,
    resolveGroupBreadcrumb,
};
