import { SentinelFilter } from '@sentinel/common/filter';

export class TrainingInstanceFilter extends SentinelFilter {
    constructor(value: string) {
        super('title', value);
    }
}
