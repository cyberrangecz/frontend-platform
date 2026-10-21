import type { AccountRole } from '../../accounts';

/** Roles that lack the sandbox designer role and are turned away from every sandbox definition path. */
export const ROLES_WITHOUT_ACCESS = [
    'trainingDesigner',
    'trainingOrganizer',
    'sandboxOrganizer',
    'userAdministrator',
    'trainee',
] as const satisfies readonly AccountRole[];

/** Links a turned-away account is not offered. */
export const SANDBOX_DEFINITION_LINKS = ['/sandbox-definition'] as const;
