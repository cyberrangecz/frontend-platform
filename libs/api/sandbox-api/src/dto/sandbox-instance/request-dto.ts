import {RequestStageState} from '@crczp/sandbox-model';

export class RequestDTO {
    id: number;
    allocation_unit_id: number;
    created: Date;
    stages: RequestStageState[];
}
