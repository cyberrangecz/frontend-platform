import { SentinelFilter } from '@sentinel/common/filter';

/**
 * Group specific filter. Filters by name
 */
export class GroupFilter extends SentinelFilter {
    constructor(value: string) {
        super('name', value);
    }
}
