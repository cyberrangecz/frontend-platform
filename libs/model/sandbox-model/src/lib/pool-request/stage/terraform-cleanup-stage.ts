import { RequestStageType } from '../../enums/request-stage-type.enum';
import { CleanupRequestStage } from './cleanup-request-stage';

export class TerraformCleanupStage extends CleanupRequestStage {
    constructor() {
        super(RequestStageType.TERRAFORM_CLEANUP);
    }
}
