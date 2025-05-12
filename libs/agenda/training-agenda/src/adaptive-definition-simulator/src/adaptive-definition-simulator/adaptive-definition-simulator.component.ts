import { Component } from '@angular/core';
import { TrainingErrorHandler, TrainingNotificationService } from '../../../index';
import { BasicEventInfo, SimulatorState } from '@crczp/adaptive-instance-simulator/instance-model-simulator';
import EventStateTypeEnum = BasicEventInfo.EventStateTypeEnum;

@Component({
    selector: 'crczp-adaptive-definition-simulator',
    templateUrl: './adaptive-definition-simulator.component.html',
    styleUrls: ['./adaptive-definition-simulator.component.css'],
})
export class AdaptiveDefinitionSimulatorComponent {
    constructor(
        private errorHandler: TrainingErrorHandler,
        private notificationService: TrainingNotificationService,
    ) {
    }

    handleState(event: SimulatorState) {
        if (event && event.state === EventStateTypeEnum.ERROR_EVENT) {
            this.errorHandler.emit(event?.error, event.message);
        } else if (event) {
            this.notificationService.emit('success', event.message);
        }
    }
}
