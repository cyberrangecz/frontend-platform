import {catchError, map, take} from "rxjs/operators";
import {Observable, of} from "rxjs";
import {Routing} from "../../routing-namespace";
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {inject} from "@angular/core";
import {ErrorHandlerService} from "../../../error-handling/error-handler.service";
import {GroupApi} from "@crczp/user-and-group-api";
import {Group} from "@crczp/user-and-group-model";

export namespace GroupResolvers {

    function navigateToGroupOverview(): UrlTree {
        return inject(Router).parseUrl(
            Routing.RouteBuilder.group.build()
        )
    }

    function navigateToNewGroup(): UrlTree {
        return inject(Router).parseUrl(
            Routing.RouteBuilder.group.create.build()
        );
    }

    function getGroup(route: ActivatedRouteSnapshot): Observable<Group | null> {
        const id = Routing.Utils.extractVariable('groupId', route);
        if (id === null) {
            return of(null);
        }
        return inject(GroupApi).get(+id).pipe(
            take(1),
            catchError((err) => {
                inject(ErrorHandlerService).emit(err, 'Resolving group from path');
                return of(null);
            })
        );
    }

    export function resolveGroup(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Group | UrlTree> | null {
        if (Routing.Utils.containsSubroute('group/create', state)) {
            return null;
        }
        return getGroup(route).pipe(
            map((group) => group ? group : navigateToNewGroup()),
            catchError(() => of(navigateToGroupOverview()))
        );
    }


    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    export function resolveGroupTitle
    (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | string {
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

        return getGroup(route).pipe(
            take(1),
            map((group) => getTitle(group)),
            catchError(() => of(''))
        );
    }


    export function resolveGroupBreadcrumb(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | string {
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

        return getGroup(route).pipe(
            map((group) => getBreadcrumb(group)),
            catchError(() => of(''))
        );
    }
}
