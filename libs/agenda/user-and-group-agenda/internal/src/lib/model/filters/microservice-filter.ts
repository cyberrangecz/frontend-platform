import {SentinelFilter} from '@sentinel/common/filter';

/**
 * Microservice specific filter. Filters by name
 */
export class MicroserviceFilter extends SentinelFilter {
    constructor(value: string) {
        super('name', value);
    }
}
