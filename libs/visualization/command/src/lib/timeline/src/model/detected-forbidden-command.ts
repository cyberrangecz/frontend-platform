import { DetectedForbiddenCommandTypeEnum } from './enums/detected-forbidden-command-type.enum';

export class DetectedForbiddenCommand {
    command: string;
    type: DetectedForbiddenCommandTypeEnum;
    hostname: string;
    occurredAt: Date;
}
