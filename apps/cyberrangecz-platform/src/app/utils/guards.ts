import { defaultIfEmpty, filter, map, switchMap, take, tap } from 'rxjs/operators';
import {
    NAVIGATE_AFTER_LOGIN_KEY,
    SentinelAuthService,
    SentinelLoginNavigationService,
    sentinelAuthGuardWithLogin,
    User,
} from '@sentinel/auth';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { ValidPath } from '@crczp/routing-commons';
import { RoleKey, RoleService, Utils } from '@crczp/utils';
import { NavConfigFactory } from './nav-config-factory';

/**
 * Narrows passed result to observable type
 * @param fromResult result to be narrowed
 */
function canActivateToObservable(
    fromResult: boolean | Promise<boolean> | Observable<boolean>,
): Observable<boolean> {
    if (fromResult instanceof Observable) {
        return fromResult;
    }
    if (typeof fromResult === 'boolean') {
        return of(fromResult);
    }
    if (fromResult instanceof Promise) {
        return from(fromResult);
    }
    throw new Error('Unsupported type for CanActivateToObservable conversion');
}

/**
 * Lets a logged-in user through and sends any other user to sign in.
 * While the stored tokens are invalid, the requested address is saved so the
 * user returns to it after signing in instead of landing on the home page.
 */
export const authGuardKeepingRequestedRoute: CanActivateFn = (
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    if (!inject(SentinelAuthService).hasValidTokens()) {
        inject(SentinelLoginNavigationService).setNavigateAfterLoginRoute(
            state.url,
        );
    }
    return sentinelAuthGuardWithLogin();
};

/**
 * Keeps a signed-in user off the login page. Sends the user to the same-app path carried by the
 * login address, then to the stored requested route, then to the home page. A target that is not
 * a path beginning with a single slash is ignored. Lets a user without valid tokens through.
 */
export const loginPageGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    if (!inject(SentinelAuthService).hasValidTokens()) {
        return true;
    }
    const loginNavigationService = inject(SentinelLoginNavigationService);
    const target = route.queryParamMap.get(NAVIGATE_AFTER_LOGIN_KEY);
    if (target && /^\/(?![/\\])/.test(target)) {
        loginNavigationService.clearNavigateAfterLoginRoute();
        return inject(Router).parseUrl(target);
    }
    return from(loginNavigationService.navigateToRequestedPage());
};

/**
 * Creates a guard that redirects to the given path if the user is not logged in
 * or does not fulfill supplied predicate. A check that ends without an answer, as
 * when signing in redirects to the identity provider, cancels the navigation.
 *
 * @param permissionsPredicate function that returns an observable indicating if the user fulfills conditions
 * @param defaultPath path to redirect to if the user does not have permissions
 * @param loginPath path to redirect to if the user is not logged in
 */
function guardBuilder(
    permissionsPredicate: () => Observable<boolean>,
    defaultPath: ValidPath = 'home',
    loginPath: ValidPath = 'login',
): CanActivateFn {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        const router = inject(Router);
        return canActivateToObservable(
            authGuardKeepingRequestedRoute(route, state) as
                | boolean
                | Promise<boolean>
                | Observable<boolean>,
        ).pipe(
            tap((isLoggedIn) => {
                if (!isLoggedIn) {
                    console.warn('You must be logged in to access this route');
                }
            }),
            switchMap((isLoggedIn) => {
                if (!isLoggedIn) {
                    return of(router.createUrlTree([loginPath]));
                }
                return permissionsPredicate().pipe(
                    tap((hasPermission) => {
                        if (!hasPermission) {
                            console.warn(
                                'Insufficient permissions for route access',
                            );
                        }
                    }),
                    map((hasPermission) => {
                        if (!hasPermission) {
                            return router.createUrlTree([defaultPath]);
                        }
                        return true;
                    }),
                );
            }),
            defaultIfEmpty(false),
        );
    };
}

/**
 * Creates a guard that redirects to the given path if the user is not logged in
 * or does not have the specified role.
 *
 * @param role role to check for
 * @param defaultPath path to redirect to if the user does not have permissions
 * @param loginPath path to redirect to if the user is not logged in
 */
function guardBuilderForRole(
    role: RoleKey,
    defaultPath: ValidPath = 'home',
    loginPath: ValidPath = 'login',
): CanActivateFn {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        const roleService = inject(RoleService);
        return guardBuilder(
            () => roleService.hasRole$(role),
            defaultPath,
            loginPath,
        )(route, state);
    };
}

/**
 * Redirects to the user's only navigable agenda, making a crossroad of a single
 * destination unnecessary. Lets the route through when the user can reach none
 * or several agendas.
 *
 * Waits for the active user to be resolved, so the decision holds on a cold page
 * load where sibling guards are still authenticating.
 */
export const soleAgendaGuard: CanActivateFn = () => {
    const router = inject(Router);
    return inject(SentinelAuthService).activeUser$.pipe(
        filter((user): user is User => user != null),
        take(1),
        map((user) => {
            const agendas = Utils.NavBar.flattenAgendas(
                Utils.NavBar.buildNav(NavConfigFactory.buildNavConfig(user)),
            );
            const [soleAgenda] = agendas;
            return agendas.length === 1 && soleAgenda
                ? router.createUrlTree([soleAgenda.path])
                : true;
        }),
    );
};

type RoleGuardMap = {
    [K in RoleKey as `${K}Guard`]: CanActivateFn;
};

/**
 * Dynamically creates guards for each role defined in the
 * PortalDynamicEnvironment roleMapping.
 *
 * The guards will be created in the RoleGuards namespace.
 */
const guardEntries: Array<[string, CanActivateFn]> = RoleService.ROLES.map(
    (roleKey) =>
        [`${roleKey}Guard`, guardBuilderForRole(roleKey)] as [
            string,
            CanActivateFn,
        ],
);

export const RoleGuards: RoleGuardMap = Object.assign(
    {},
    ...guardEntries.map(([key, value]) => ({ [key]: value })),
) as RoleGuardMap;
