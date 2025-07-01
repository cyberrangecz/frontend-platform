import {Component} from '@angular/core';
import {TrainingErrorHandler, TrainingNotificationService} from '@crczp/training-agenda';
import {
    InstanceModelSimulatorComponent,
    SimulatorState,
    SimulatorStateEventTypeEnum
} from "@crczp/adaptive-instance-simulator";

@Component({
    selector: 'crczp-adaptive-definition-simulator-wrapper',
    templateUrl: './adaptive-definition-simulator.component.html',
    styleUrls: ['./adaptive-definition-simulator.component.css'],
    imports: [
        InstanceModelSimulatorComponent
    ]
})
export class AdaptiveDefinitionSimulatorComponent {
    constructor(
        private errorHandler: TrainingErrorHandler,
        private notificationService: TrainingNotificationService,
    ) {
    }

    handleState(event: SimulatorState) {
        if (event && event.state === SimulatorStateEventTypeEnum.ERROR_EVENT) {
            this.errorHandler.emit(event?.error, event.message);
        } else if (event) {
            this.notificationService.emit('success', event.message);
        }
    }
}
