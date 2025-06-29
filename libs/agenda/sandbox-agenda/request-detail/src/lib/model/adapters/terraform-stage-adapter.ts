import { StageAdapter } from './stage-adapter';
import { TerraformAllocationStage } from '@crczp/sandbox-model';

export class TerraformStageAdapter extends TerraformAllocationStage implements StageAdapter {
    detailDisabled: boolean;
    hasDetail: boolean;
    logoSrc: string;
    title: string;
    hasError: boolean;
    isExpanded: boolean;
}
