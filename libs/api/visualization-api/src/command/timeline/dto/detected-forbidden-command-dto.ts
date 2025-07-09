export interface DetectedForbiddenCommandDTO {
    command: string;
    type: DetectedForbiddenCommandDTO.DetectedForbiddenCommandTypeEnum;
    hostname: string;
    occurred_at: Date;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DetectedForbiddenCommandDTO {
    export type DetectedForbiddenCommandTypeEnum = 'BASH' | 'MSF';
    export const DetectedForbiddenCommandTypeEnum = {
        BASH: 'BASH' as DetectedForbiddenCommandTypeEnum,
        MSF: 'MSF' as DetectedForbiddenCommandTypeEnum,
    };
}
