import { QueryParam } from '@crczp/api-common';

/**
 * User specific filter. Filters by family name
 */
export class UserFilter extends QueryParam {
    constructor(value: string) {
        super('fullName', value);
    }
}
