export interface DetectedForbiddenCommandDTO {
    command: string;
    type: DetectedForbiddenCommandDTODetectedForbiddenCommandTypeEnum;
    hostname: string;
    occurred_at: Date;
}

export type DetectedForbiddenCommandDTODetectedForbiddenCommandTypeEnum = 'BASH' | 'MSF';
export const DetectedForbiddenCommandDTODetectedForbiddenCommandTypeEnum = {
    BASH: 'BASH' as DetectedForbiddenCommandDTODetectedForbiddenCommandTypeEnum,
    MSF: 'MSF' as DetectedForbiddenCommandDTODetectedForbiddenCommandTypeEnum,
};
