import { SentinelFilter } from '@sentinel/common/filter';

export class DetectionEventFilter extends SentinelFilter {
    constructor(value: string) {
        super('title', value);
    }
}
