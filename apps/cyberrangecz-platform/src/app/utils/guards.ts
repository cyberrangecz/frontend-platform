import { map } from 'rxjs/operators';
import { sentinelAuthGuard } from '@sentinel/auth';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { RoleService } from '../services/role.service';
import { PortalDynamicEnvironment } from '../portal-dynamic-environment';
import { from, Observable, of } from 'rxjs';
import { ValidPath } from '@crczp/routing-commons';

/**
 * Narrows passed result to observable type
 * @param fromResult result to be narrowed
 */
function canActivateToObservable(
    fromResult: boolean | Promise<boolean> | Observable<boolean>
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
 * Creates a guard that redirects to the given path if the user is not logged in
 * or does not fulfill supplied predicate.
 *
 * @param redirect path to redirect to if the user is not logged in or does not have permissions
 * @param permissionsPredicate function that returns true if the user fulfills conditions
 */
function guardBuilder(
    redirect: ValidPath,
    permissionsPredicate: () => boolean
): CanActivateFn {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        const router = inject(Router);
        return canActivateToObservable(sentinelAuthGuard()).pipe(
            map((isLoggedIn) => {
                if (!(isLoggedIn && permissionsPredicate())) {
                    return router.createUrlTree([redirect]);
                }
                return true;
            })
        );
    };
}

/**
 * Creates a guard that redirects to the given path if the user is not logged in
 * or does not have the specified role.
 *
 * @param redirect path to redirect to if the user is not logged in or does not have the role
 * @param role role to check for
 */
function guardBuilderForRole(
    redirect: ValidPath,
    role: RoleKey
): CanActivateFn {
    return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
        const roleService = inject(RoleService);
        return guardBuilder(redirect, () => roleService.hasRole(role))(
            route,
            state
        );
    };
}

/**
 * Creates a guard that redirects to the training run path if
 * a user is not an advanced user (has a stronger role than trainee).
 */
const advancedUserGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const roleService = inject(RoleService);
    const roleMapping = PortalDynamicEnvironment.getConfig().roleMapping;

    return guardBuilder('run', () =>
        roleService.hasAny(
            Object.values(roleMapping)
                .map((role) => role as RoleKey)
                .filter((role) => role !== roleMapping.trainingTrainee)
        )
    )(route, state);
};
/**
 * Definitions of custom guards that are not based on roles.
 * These will be automatically added to the RoleGuards namespace
 */
const customGuards = {
    advancedUserGuard: advancedUserGuard,
};
type RoleKey = keyof typeof RoleService.ROLES;

type RoleGuardMap = {
    [K in RoleKey as `${K}Guard`]: CanActivateFn;
} & typeof customGuards;

/**
 * Dynamically creates guards for each role defined in the
 * PortalDynamicEnvironment roleMapping.
 *
 * The guards will be created in the RoleGuards namespace.
 */
export const RoleGuards: RoleGuardMap = Object.fromEntries(
    (Object.keys(RoleService.ROLES) as RoleKey[])
        .map((key) => [`${key}Guard`, guardBuilderForRole('home', key)])
        .concat(Object.entries(customGuards))
) as RoleGuardMap;
