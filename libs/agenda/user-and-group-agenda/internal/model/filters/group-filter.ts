import { QueryParam } from '@crczp/api-common';

/**
 * Group specific filter. Filters by name
 */
export class GroupFilter extends QueryParam {
    constructor(value: string) {
        super('name', value);
    }
}
