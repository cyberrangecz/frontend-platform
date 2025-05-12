import { SentinelFilter } from '@sentinel/common/filter';

export class AdaptiveInstanceFilter extends SentinelFilter {
    constructor(value: string) {
        super('title', value);
    }
}
