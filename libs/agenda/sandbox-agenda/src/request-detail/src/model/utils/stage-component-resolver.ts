import { RequestStageType } from '@crczp/sandbox-model';
import { StageDetailComponentEnum } from './stage-detail-component-enum';

export class StageComponentResolver {
    static resolve(stageType: RequestStageType): StageDetailComponentEnum {
        switch (stageType) {
            case RequestStageType.NETWORKING_ANSIBLE_ALLOCATION: {
                return StageDetailComponentEnum.ANSIBLE_ALLOCATION;
            }
            case RequestStageType.USER_ANSIBLE_ALLOCATION: {
                return StageDetailComponentEnum.ANSIBLE_ALLOCATION;
            }
            case RequestStageType.TERRAFORM_ALLOCATION: {
                return StageDetailComponentEnum.TERRAFORM_ALLOCATION;
            }
        }
    }
}
