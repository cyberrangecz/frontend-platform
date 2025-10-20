import { QueryParam } from '@crczp/api-common';

export class TrainingInstanceFilter extends QueryParam {
    constructor(value: string) {
        super('title', value);
    }
}
