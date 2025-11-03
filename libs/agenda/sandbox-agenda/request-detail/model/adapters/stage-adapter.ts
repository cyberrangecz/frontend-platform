import { RequestStage } from '@crczp/sandbox-model';

export interface StageAdapter extends RequestStage {
    logoSrc: string;
    title: string;
    hasDetail: boolean;
    hasError: boolean;
    detailDisabled: boolean;
    repoUrl?: string;
    rev?: string;
}
