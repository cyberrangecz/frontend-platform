import {SentinelFilter} from '@sentinel/common/filter';

/**
 * User specific filter. Filters by family name
 */
export class UserFilter extends SentinelFilter {
    constructor(value: string) {
        super('fullName', value);
    }
}
