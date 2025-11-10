import { inject, Injectable } from '@angular/core';
import { SentinelAuthService } from '@sentinel/auth';
import { PortalConfig } from '@crczp/utils';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type RoleKey =
    | 'uagAdmin'
    | 'trainingDesigner'
    | 'trainingOrganizer'
    | 'adaptiveTrainingDesigner'
    | 'adaptiveTrainingOrganiser'
    | 'trainingTrainee'
    | 'sandboxDesigner'
    | 'sandboxOrganizer';

export type RolePredicateMap = {
    [K in RoleKey as `${K}Guard`]: () => boolean;
};

@Injectable({
    providedIn: 'root',
})
export class RoleService {
    public static readonly ROLES: RoleKey[] = [
        'uagAdmin',
        'trainingDesigner',
        'trainingOrganizer',
        'adaptiveTrainingDesigner',
        'adaptiveTrainingOrganiser',
        'trainingTrainee',
        'sandboxDesigner',
        'sandboxOrganizer',
    ];

    /**
     * Dynamically created predicates for each role
     *
     * Returns true if the user has the specified role
     */
    public readonly rolePredicates: RolePredicateMap = Object.fromEntries(
        (Object.keys(this) as RoleKey[]).map((key) => [
            `is${String(key).charAt(0).toUpperCase() + String(key).slice(1)}`,
            () => this.hasRole(key),
        ]),
    ) as RolePredicateMap;
    private readonly authService = inject(SentinelAuthService);
    private readonly rolesDict: Set<string> = new Set();
    private readonly config = inject(PortalConfig);

    constructor() {
        this.authService.activeUser$.subscribe((user) => {
            this.rolesDict.clear();
            if (user) {
                user.roles.forEach((role) => this.rolesDict.add(role.roleType));
            }
        });
    }

    /**
     * @param roleKey role to check
     * @returns true if the user has the role
     */
    hasRole(roleKey: RoleKey) {
        return this.rolesDict.has(this.config.roleMapping[roleKey]);
    }

    /**
     * @param roles roles to check
     * @returns true if the user has any (at least one) of the roles
     */
    hasAny(roles: RoleKey[]) {
        return roles
            .map((roleKey) => this.config.roleMapping[roleKey])
            .some((role) => this.hasRole(role));
    }

    /**
     * @param roles roles to check
     * @returns true if the user has all specified roles
     */
    hasAll(roles: RoleKey[]) {
        return !roles
            .map((roleKey) => this.config.roleMapping[roleKey])
            .some((role) => !this.hasRole(role));
    }

    /**
     * Checks if the user has the specified role
     * Use this method when you need to wait for the user to be loaded
     * or listen for changes
     *
     * @param roleKey role to check
     * @returns observable that emits true if the user has the role
     */
    hasRole$(roleKey: RoleKey): Observable<boolean> {
        return this.authService.activeUser$.pipe(
            map((user) => {
                if (!user) {
                    return false;
                }
                const mappedRole = this.config.roleMapping[roleKey];
                return user.roles.some((role) => role.roleType === mappedRole);
            }),
        );
    }

    /**
     * Checks if the user has any of the specified roles
     * Use this method when you need to wait for the user to be loaded
     * or listen for changes
     *
     * @param roleKeys roles to check
     * @returns observable that emits true if the user has any of the roles
     */
    hasAny$(roleKeys: RoleKey[]): Observable<boolean> {
        return this.authService.activeUser$.pipe(
            map((user) => {
                if (!user) {
                    return false;
                }
                const mappedRoles = roleKeys.map(
                    (roleKey) => this.config.roleMapping[roleKey],
                );
                return user.roles.some((role) =>
                    mappedRoles.includes(role.roleType),
                );
            }),
        );
    }
}
