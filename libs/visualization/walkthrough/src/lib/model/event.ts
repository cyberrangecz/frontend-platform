import { EventType } from './enums/event-type';

export class Event {
    time!: number;
    type!: EventType;
    level!: number;
    commands!: Array<string>;
    points!: number;
}
