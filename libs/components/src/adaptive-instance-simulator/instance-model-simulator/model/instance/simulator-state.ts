import {HttpErrorResponse} from '@angular/common/http';

export class SimulatorState {
    state: SimulatorEvents.EventStateTypeEnum;
    message: string;
    error?: HttpErrorResponse;

    constructor(message: string, state: SimulatorEvents.EventStateTypeEnum, error?: HttpErrorResponse) {
        this.message = message;
        this.state = state;
        this.error = error;
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace SimulatorEvents {
    export type EventStateTypeEnum = 'ERROR_EVENT' | 'NOTIFICATION_EVENT';
    export const EventStateTypeEnum = {
        ERROR_EVENT: 'ERROR_EVENT' as EventStateTypeEnum,
        NOTIFICATION_EVENT: 'NOTIFICATION_EVENT' as EventStateTypeEnum,
    };
}

export const SimulatorStateEventTypeEnum = SimulatorEvents.EventStateTypeEnum;
