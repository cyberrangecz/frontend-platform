
export class DetectedForbiddenCommand {
    command: string;
    type: DetectedForbiddenCommandTypeEnum;
    hostname: string;
    occurredAt: Date;
}

export enum DetectedForbiddenCommandTypeEnum {
    Bash = 'BASH',
    Msf = 'MSF',
}
