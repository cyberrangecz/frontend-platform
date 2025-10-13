import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { GroupApi, UserApi } from '@crczp/user-and-group-api';
import { Routing } from '../../routing-namespace';
import { Observable, of } from 'rxjs';
import { Group, User } from '@crczp/user-and-group-model';
import { catchError, map, take } from 'rxjs/operators';
import { CommonResolverHelperService } from '../common-resolver-helper-service';

@Injectable({
    providedIn: 'root',
})
export class UserAndGroupResolverHelperService extends CommonResolverHelperService {
    private readonly groupApi = inject(GroupApi);
    private readonly userApi = inject(UserApi);

    constructor() {
        super(inject(ErrorHandlerService), inject(Router));
    }

    public getGroup(route: ActivatedRouteSnapshot): Observable<Group | null> {
        const id = Routing.Utils.extractVariable('groupId', route);
        if (id === null) {
            return this.emitFrontendError('No group id found in route').pipe(
                map(() => null)
            );
        }
        return this.groupApi.get(+id).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Resolving group from path');
                return of(null);
            })
        );
    }

    public getUser(userId: string): Observable<User | null> {
        const id = Number(userId);
        return this.userApi.get(id).pipe(
            take(1),
            catchError((err) => {
                inject(ErrorHandlerService).emitAPIError(
                    err,
                    'Resolving user from path'
                );
                return of(null);
            })
        );
    }

    public navigateToGroupOverview() {
        return this.navigate(
            this.router.parseUrl(Routing.RouteBuilder.group.build())
        );
    }

    navigateToUserOverview() {
        return this.navigate(
            this.router.parseUrl(Routing.RouteBuilder.user.build())
        );
    }

    public navigateToNewGroup() {
        return this.navigate(
            this.router.parseUrl(Routing.RouteBuilder.group.create.build())
        );
    }
}
