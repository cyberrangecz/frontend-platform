import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot} from '@angular/router';
import {User} from '@crczp/user-and-group-model';
import {UserApi} from '@crczp/user-and-group-api';
import {EMPTY, Observable, of} from 'rxjs';
import {catchError, mergeMap, take} from 'rxjs/operators';
import {ErrorHandlerService, Routing} from "@crczp/common";

/**
 * Example resolver for user and user-overview state component
 */
@Injectable()
export class UserResolverService {
    private router = inject(Router);
    private api = inject(UserApi);
    private errorHandler = inject(ErrorHandlerService);

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<User> | Promise<User> | User {
        if (route.paramMap.has(User.name)) {
            const id = Number(route.paramMap.get(User.name));
            return this.api.get(id).pipe(
                take(1),
                mergeMap((user) => (user ? of(user) : this.navigateToOverview())),
                catchError((err) => {
                    this.errorHandler.emit(err, 'Resolving user-overview');
                    return this.navigateToOverview();
                })
            );
        }
        return this.navigateToOverview();
    }

    private navigateToOverview(): Observable<never> {
        this.router.navigate([Routing.RouteBuilder.user.build()]);
        return EMPTY;
    }
}
