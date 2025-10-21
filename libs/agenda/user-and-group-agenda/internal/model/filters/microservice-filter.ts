import { QueryParam } from '@crczp/api-common';

/**
 * Microservice specific filter. Filters by name
 */
export class MicroserviceFilter extends QueryParam {
    constructor(value: string) {
        super('name', value);
    }
}
