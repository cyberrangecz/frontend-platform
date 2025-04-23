import { GraphEventTypeEnum } from '../enums/graph-event-type-enum';

export class GraphEvent {
    message: GraphEventTypeEnum;
    payload?: any;

    constructor(message: GraphEventTypeEnum, payload?) {
        this.message = message;
        this.payload = payload;
    }
}
