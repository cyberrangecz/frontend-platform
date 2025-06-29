import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {GroupApi} from '@crczp/user-and-group-api';
import {Group} from '@crczp/user-and-group-model';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, mergeMap, take} from 'rxjs/operators';
import {
    GROUP_NEW_PATH,
    GROUP_PATH,
    GROUP_SELECTOR,
    UserAndGroupErrorHandler,
    UserAndGroupNavigator
} from '@crczp/user-and-group-agenda';

/**
 * Example resolver for user and group-overview state component
 */
@Injectable()
export class GroupResolver {
    constructor(
        private router: Router,
        private api: GroupApi,
        private errorHandler: UserAndGroupErrorHandler,
        private navigator: UserAndGroupNavigator
    ) {
    }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Group> | Promise<Group> | Group {
        if (state.url.endsWith(`${GROUP_PATH}/${GROUP_NEW_PATH}`)) {
            return null;
        }
        if (route.paramMap.has(GROUP_SELECTOR)) {
            const id = Number(route.paramMap.get(GROUP_SELECTOR));
            return this.api.get(id).pipe(
                take(1),
                mergeMap((group) => (group ? of(group) : this.navigateToNew())),
                catchError((err) => {
                    this.errorHandler.emit(err, 'Resolving group-overview');
                    return this.navigateToNew();
                })
            );
        }
        return this.navigateToNew();
    }

    private navigateToNew(): Observable<never> {
        this.router.navigate([this.navigator.toNewGroup()]);
        return EMPTY;
    }
}
