import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable, of} from 'rxjs';
import {catchError, map, take} from "rxjs/operators";
import {User} from "libs/model/user-and-group-model/src";
import {inject} from "@angular/core";
import {UserApi} from "libs/api/user-and-group-api/src";
import {ErrorHandlerService, Routing} from "../../../index";

export namespace UserResolvers {

    function navigateToUserOverview(): UrlTree {
        return inject(Router).parseUrl(
            Routing.RouteBuilder.user.build()
        )
    }

    function getUserFromUserId(userId: string): Observable<User | undefined> {
        const id = Number(userId);
        return inject(UserApi).get(id).pipe(
            take(1),
            catchError((err) => {
                inject(ErrorHandlerService).emit(err, 'Resolving user from path');
                return of(undefined);
            })
        );
    }

    export function resolveUser(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<User | UrlTree> | UrlTree {
        const userId = Routing.Utils.extractVariable<'user'>('userId', route);
        if (!userId) return navigateToUserOverview();

        return getUserFromUserId(userId).pipe(
            map((user) => user ? user : navigateToUserOverview())
        )
    }


    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    export function resolveUserTitle
    (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | string {
        const userId = Routing.Utils.extractVariable<'user'>('userId', route);
        if (!userId) return 'User Detail';

        return getUserFromUserId(userId).pipe(
            take(1),
            map((user) => (user ? `${user.name} Detail` : 'User Detail')),
            catchError(() => of(''))
        );
    }


}
