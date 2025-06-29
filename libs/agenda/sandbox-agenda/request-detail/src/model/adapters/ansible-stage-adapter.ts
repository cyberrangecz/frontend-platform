import { StageAdapter } from 'libs/agenda/sandbox-agenda/request-detail/src/model/adapters/stage-adapter';
import { UserAnsibleAllocationStage } from '@crczp/sandbox-model';

export class AnsibleStageAdapter extends UserAnsibleAllocationStage implements StageAdapter {
    detailDisabled: boolean;
    hasDetail: boolean;
    logoSrc: string;
    title: string;
    hasError: boolean;
    isExpanded: boolean;
}
