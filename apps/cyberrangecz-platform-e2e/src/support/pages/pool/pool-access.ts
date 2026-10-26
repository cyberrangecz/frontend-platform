import type { AccountRole } from '../../accounts';

/** Roles that hold no sandbox organizer role and are turned away from pool and image paths. */
export const ROLES_WITHOUT_POOL_ACCESS: readonly AccountRole[] = [
    'trainingDesigner',
    'sandboxDesigner',
    'userAdministrator',
    'trainee',
];

/** Links a turned-away account is not offered. */
export const POOL_LINKS: readonly string[] = ['/pool', '/sandbox-image'];
