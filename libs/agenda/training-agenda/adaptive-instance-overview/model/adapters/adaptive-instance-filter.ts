import { QueryParam } from '@crczp/api-common';

export class AdaptiveInstanceFilter extends QueryParam {
    constructor(value: string) {
        super('title', value);
    }
}
