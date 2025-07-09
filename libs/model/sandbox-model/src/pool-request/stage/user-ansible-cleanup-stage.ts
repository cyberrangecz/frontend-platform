import {RequestStageType} from '../../enums/request-stage-type.enum';
import {CleanupRequestStage} from './cleanup-request-stage';

export class UserAnsibleCleanupStage extends CleanupRequestStage {
    constructor() {
        super(RequestStageType.USER_ANSIBLE_CLEANUP);
    }
}
