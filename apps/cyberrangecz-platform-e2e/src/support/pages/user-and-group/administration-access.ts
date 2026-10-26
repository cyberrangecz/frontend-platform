import type { AccountRole } from '../../accounts';

/** Roles that lack the user administrator role and are turned away from every administration path. */
export const ROLES_WITHOUT_ADMINISTRATION = [
    'trainingDesigner',
    'trainingOrganizer',
    'sandboxDesigner',
    'sandboxOrganizer',
    'trainee',
] as const satisfies readonly AccountRole[];

/** Links a turned-away account is not offered. */
export const ADMINISTRATION_LINKS = ['/user', '/group', '/microservice'] as const;
