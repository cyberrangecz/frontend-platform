import { QueryParam } from '@crczp/api-common';

export class DetectionEventFilter extends QueryParam {
    constructor(value: string) {
        super('title', value);
    }
}
