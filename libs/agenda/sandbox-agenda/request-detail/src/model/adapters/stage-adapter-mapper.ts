import { AllocationRequestStage, RequestStage } from '@crczp/sandbox-model';
import {
    ANSIBLE_NETWORKING_TYPES,
    ANSIBLE_STAGE_TYPES,
    ANSIBLE_USER_TYPES,
    TERRAFORM_STAGE_TYPES,
} from 'libs/agenda/sandbox-agenda/request-detail/src/model/utils/stage-types';
import { ANSIBLE_LOGO_SRC, TERRAFORM_LOGO_SRC } from 'libs/agenda/sandbox-agenda/request-detail/src/model/utils/stage-logos';
import { StageAdapter } from 'libs/agenda/sandbox-agenda/request-detail/src/model/adapters/stage-adapter';

export class StageAdapterMapper {
    static fromStage(stage: RequestStage): StageAdapter {
        const adapter = stage as StageAdapter;
        adapter.logoSrc = this.resolveLogoSrc(stage);
        adapter.title = this.resolveTitle(stage);
        adapter.hasDetail = this.resolveHasDetail(stage);
        adapter.detailDisabled = this.resolveDetailDisabled(stage);
        return adapter;
    }

    private static resolveLogoSrc(stage: RequestStage): string {
        if (TERRAFORM_STAGE_TYPES.includes(stage.type)) {
            return TERRAFORM_LOGO_SRC;
        } else if (ANSIBLE_STAGE_TYPES.includes(stage.type)) {
            return ANSIBLE_LOGO_SRC;
        }
    }

    private static resolveTitle(stage: RequestStage): string {
        if (TERRAFORM_STAGE_TYPES.includes(stage.type)) {
            return `Terraform Stage ${stage.id}`;
        } else if (ANSIBLE_NETWORKING_TYPES.includes(stage.type)) {
            return `Networking Ansible Stage ${stage.id}`;
        } else if (ANSIBLE_USER_TYPES.includes(stage.type)) {
            return `User Ansible Stage ${stage.id}`;
        }
    }

    private static resolveHasDetail(stage: RequestStage): boolean {
        return stage instanceof AllocationRequestStage;
    }

    private static resolveDetailDisabled(stage: RequestStage): boolean {
        return stage.isInQueue();
    }
}
