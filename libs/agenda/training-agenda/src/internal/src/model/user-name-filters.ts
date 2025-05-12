import { SentinelFilter } from '@sentinel/common/filter';

/**
 * Creates filters from user name filter value
 */
export class UserNameFilters {
    static create(filterValue: string): SentinelFilter[] {
        if (!filterValue || filterValue === '' || filterValue.trim().length <= 0) {
            return [];
        }
        const split = filterValue.split(' ');
        if (split.length === 1) {
            return [new SentinelFilter('familyName', split[0])];
        }
        if (split.length > 1) {
            return [new SentinelFilter('givenName', split[0]), new SentinelFilter('familyName', split[1])];
        }
    }
}
