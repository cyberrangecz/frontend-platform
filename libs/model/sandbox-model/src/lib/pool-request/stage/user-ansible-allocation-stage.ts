import { RequestStageType } from '../../enums/request-stage-type.enum';
import { AllocationRequestStage } from './allocation-request-stage';

/**
 * Class representing ansible stage
 */
export class UserAnsibleAllocationStage extends AllocationRequestStage {
    repoUrl!: string;
    rev!: string;

    constructor() {
        super(RequestStageType.USER_ANSIBLE_ALLOCATION);
    }
}
