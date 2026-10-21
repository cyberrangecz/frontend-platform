import { QueryParam } from '@crczp/api-common';

/**
 * Creates the user name filter: a single `name` parameter carrying the trimmed filter text.
 */
export class UserNameFilters {
    static create(filterValue: string): QueryParam[] {
        const name = filterValue?.trim();
        return name ? [new QueryParam('name', name)] : [];
    }
}
