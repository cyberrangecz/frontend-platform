import { RequestStageDTO } from './request-stage-dto';

export class TerraformAllocationStageDTO extends RequestStageDTO {
    status: string;
    status_reason: string;
}
