import {SentinelFilter} from '@sentinel/common/filter';

/**
 * Role specific filter. Filters by role type
 */
export class RoleFilter extends SentinelFilter {
    constructor(value: string) {
        super('roleType', value);
    }
}
