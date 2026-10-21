import { QueryParam } from '@crczp/api-common';

/**
 * User specific filter. Filters by given name and family name
 */
export class UserFilter extends QueryParam {
    constructor(value: string) {
        super('name', value);
    }
}
