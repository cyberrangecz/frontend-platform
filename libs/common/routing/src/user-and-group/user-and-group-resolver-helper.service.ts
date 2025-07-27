import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { GroupApi, MicroserviceApi, UserApi } from '@crczp/user-and-group-api';
import { Routing } from '../routing-namespace';
import { Observable, of } from 'rxjs';
import { Group } from '@crczp/user-and-group-model';
import { catchError, take } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class UserAndGroupResolverHelperService {
    private readonly errorHandler = inject(ErrorHandlerService);
    public readonly emit = this.errorHandler.emit;
    private readonly router = inject(Router);

    private readonly userApi = inject(UserApi);
    private readonly groupApi = inject(GroupApi);
    private readonly microserviceApi = inject(MicroserviceApi);

    public getGroup(route: ActivatedRouteSnapshot): Observable<Group | null> {
        const errorHandler = inject(ErrorHandlerService);
        const id = Routing.Utils.extractVariable('groupId', route);
        if (id === null) {
            return of(null);
        }
        return inject(GroupApi)
            .get(+id)
            .pipe(
                take(1),
                catchError((err) => {
                    errorHandler.emit(err, 'Resolving group from path');
                    return of(null);
                })
            );
    }

    public navigateToGroupOverview(): UrlTree {
        return inject(Router).parseUrl(Routing.RouteBuilder.group.build());
    }

    public navigateToNewGroup(): UrlTree {
        return inject(Router).parseUrl(
            Routing.RouteBuilder.group.create.build()
        );
    }
}
