import { TrainingEventType } from './enums/training-event-type';

export class TrainingEvent {
    time!: number;
    type!: TrainingEventType;
    level!: number;
    commands!: Array<string>;
    points!: number;
}
