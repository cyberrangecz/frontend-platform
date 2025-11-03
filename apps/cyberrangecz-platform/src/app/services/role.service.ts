import { inject, Injectable } from '@angular/core';
import { SentinelAuthService } from '@sentinel/auth';
import { PortalConfig } from '@crczp/utils';

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

    hasRole(roleKey: RoleKey) {
        return this.rolesDict.has(this.config.roleMapping[roleKey]);
    }

    hasAny(roles: RoleKey[]) {
        return roles
            .map((roleKey) => this.config.roleMapping[roleKey])
            .some((role) => this.hasRole(role));
    }

    hasAll(roles: RoleKey[]) {
        return !roles
            .map((roleKey) => this.config.roleMapping[roleKey])
            .some((role) => !this.hasRole(role));
    }
}
