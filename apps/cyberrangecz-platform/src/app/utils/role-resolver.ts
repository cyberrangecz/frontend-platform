import {UserRole} from '@sentinel/auth';
import {PortalDynamicEnvironment} from '../portal-dynamic-environment';

export class RoleResolver {
    static isUserAndGroupAdmin(roles: UserRole[]): boolean {
        return roles.some((role) => role.roleType === PortalDynamicEnvironment.getConfig().roleMapping.uagAdmin);
    }

    static isTrainingDesigner(roles: UserRole[]): boolean {
        return roles.some(
            (role) => role.roleType === PortalDynamicEnvironment.getConfig().roleMapping.trainingDesigner,
        );
    }

    static isTrainingOrganizer(roles: UserRole[]): boolean {
        return roles.some(
            (role) => role.roleType === PortalDynamicEnvironment.getConfig().roleMapping.trainingOrganizer,
        );
    }

    static isAdaptiveTrainingDesigner(roles: UserRole[]): boolean {
        return roles.some(
            (role) => role.roleType === PortalDynamicEnvironment.getConfig().roleMapping.adaptiveTrainingDesigner,
        );
    }

    static isAdaptiveTrainingOrganizer(roles: UserRole[]): boolean {
        return roles.some(
            (role) => role.roleType === PortalDynamicEnvironment.getConfig().roleMapping.adaptiveTrainingOrganizer,
        );
    }

    static isTrainingTrainee(roles: UserRole[]): boolean {
        return roles.some((role) => role.roleType === PortalDynamicEnvironment.getConfig().roleMapping.trainingTrainee);
    }

    static isSandboxDesigner(roles: UserRole[]): boolean {
        return roles.some((role) => role.roleType === PortalDynamicEnvironment.getConfig().roleMapping.sandboxDesigner);
    }

    static isSandboxOrganizer(roles: UserRole[]): boolean {
        return roles.some(
            (role) => role.roleType === PortalDynamicEnvironment.getConfig().roleMapping.sandboxOrganizer,
        );
    }
}
