import { QueryParam } from '@crczp/api-common';

/**
 * Role specific filter. Filters by role type
 */
export class RoleFilter extends QueryParam {
    constructor(value: string) {
        super('roleType', value);
    }
}
