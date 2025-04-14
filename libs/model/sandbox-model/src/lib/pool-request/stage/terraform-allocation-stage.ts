import { RequestStageType } from '../../enums/request-stage-type.enum';
import { AllocationRequestStage } from './allocation-request-stage';

/**
 * Class representing terraform stage
 */
export class TerraformAllocationStage extends AllocationRequestStage {
    status!: string;
    statusReason!: string;

    constructor() {
        super(RequestStageType.TERRAFORM_ALLOCATION);
    }
}
