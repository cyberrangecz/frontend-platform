import {Injectable} from '@angular/core';
import {SentinelAuthService} from "@sentinel/auth";


type RoleKey = keyof typeof RoleService.ROLES;

type RolePredicateMap = {
    [K in RoleKey as `${K}Guard`]: () => boolean;
};

@Injectable({
    providedIn: 'root'
})
export class RoleService {

    public static readonly ROLES = {
        uagAdmin: "ROLE_USER_AND_GROUP_ADMINISTRATOR",
        trainingDesigner: "ROLE_TRAINING_DESIGNER",
        trainingOrganizer: "ROLE_TRAINING_ORGANIZER",
        adaptiveTrainingDesigner: "ROLE_ADAPTIVE_TRAINING_DESIGNER",
        adaptiveTrainingOrganizer: "ROLE_ADAPTIVE_TRAINING_ORGANIZER",
        trainingTrainee: "ROLE_TRAINING_TRAINEE",
        sandboxDesigner: "ROLE_SANDBOX-SERVICE_DESIGNER",
        sandboxOrganizer: "ROLE_SANDBOX-SERVICE_ORGANIZER"
    };

    /**
     * Dynamically created predicates for each role
     */
    public readonly rolePredicates: RolePredicateMap = Object.fromEntries(
        (Object.keys(this) as RoleKey[]).map((key) => [
            `is${String(key).charAt(0).toUpperCase() + String(key).slice(1)}`,
            () => this.hasRole(RoleService.ROLES[key])
        ])
    ) as RolePredicateMap;

    private readonly rolesDict: Set<string> = new Set();

    constructor(authService: SentinelAuthService) {
        authService.activeUser$.subscribe(
            user => {
                this.rolesDict.clear();
                if (!!user) {
                    user.roles.forEach((role) => this.rolesDict.add(role.roleType));
                }
            }
        )
    }

    hasRole(roleType: string) {
        return this.rolesDict.has(roleType);
    }

    hasAny(roles: string[]) {
        return roles.some(role => this.rolesDict.has(role));
    }

    hasAll(roles: string[]) {
        return !roles.some(role => !this.rolesDict.has(role));
    }
}
