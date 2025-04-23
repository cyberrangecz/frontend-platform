export interface BasicPhaseInfoDTO {
    id: number;
    phase_type: BasicPhaseInfoDTO.PhaseTypeEnum;
    order: number;
    title: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace BasicPhaseInfoDTO {
    export type PhaseTypeEnum = 'INFO' | 'TASK' | 'TRAINING' | 'QUESTIONNAIRE' | 'ACCESS';
    export const PhaseTypeEnum = {
        INFO: 'INFO' as PhaseTypeEnum,
        TASK: 'TASK' as PhaseTypeEnum,
        TRAINING: 'TRAINING' as PhaseTypeEnum,
        QUESTIONNAIRE: 'QUESTIONNAIRE' as PhaseTypeEnum,
        ACCESS: 'ACCESS' as PhaseTypeEnum,
    };
}
