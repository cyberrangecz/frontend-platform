import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {Observable, of} from 'rxjs';
import {catchError, map, take} from 'rxjs/operators';
import {UserResolverService} from './user-resolver.service';
import {User} from '@crczp/user-and-group-model';
import {Routing} from "@crczp/common";

@Injectable()
export class UserTitleResolverService {
    private userResolver = inject(UserResolverService);


    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (route.paramMap.has(User.name)) {
            const resolved = this.userResolver.resolve(route, state) as Observable<User>;
            return resolved.pipe(
                take(1),
                map((user) => (user ? this.getTitleFromUser(user, route) : '')),
                catchError(() => of(''))
            );
        }
        return '';
    }

    private getTitleFromUser(user: User, snapshot: ActivatedRouteSnapshot): string {
        if (Routing.Utils.hasVariable('userId', snapshot)) {
            return `${user.name} Detail`;
        }
        return user.name;
    }
}
