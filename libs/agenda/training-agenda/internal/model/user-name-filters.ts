import { QueryParam } from '@crczp/api-common';

/**
 * Creates filters from user name filter value
 */
export class UserNameFilters {
    static create(filterValue: string): QueryParam[] {
        if (
            !filterValue ||
            filterValue === '' ||
            filterValue.trim().length <= 0
        ) {
            return [];
        }
        const split = filterValue.split(' ');
        if (split.length === 1) {
            return [new QueryParam('familyName', split[0])];
        }
        if (split.length > 1) {
            return [
                new QueryParam('givenName', split[0]),
                new QueryParam('familyName', split[1]),
            ];
        }
        return [];
    }
}
