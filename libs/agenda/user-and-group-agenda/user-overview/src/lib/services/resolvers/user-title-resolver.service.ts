import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {Observable, of} from 'rxjs';
import {catchError, map, take} from 'rxjs/operators';
import {UserResolverService} from './user-resolver.service';
import {User} from '@crczp/user-and-group-model';
import {USER_DETAIL_PATH, USER_SELECTOR} from "@crczp/user-and-group-agenda";

@Injectable()
export class UserTitleResolverService {
    constructor(private userResolver: UserResolverService) {
    }

    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (route.paramMap.has(USER_SELECTOR)) {
            const resolved = this.userResolver.resolve(route, state) as Observable<User>;
            return resolved.pipe(
                take(1),
                map((user) => (user ? this.getTitleFromUser(user, state) : '')),
                catchError(() => of(''))
            );
        }
        return '';
    }

    private getTitleFromUser(user: User, state: RouterStateSnapshot): string {
        if (state.url.includes(USER_DETAIL_PATH)) {
            return `${user.name} Detail`;
        }
        return user.name;
    }
}
