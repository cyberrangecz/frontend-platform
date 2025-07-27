import { Component, inject } from '@angular/core';
import {
    InstanceModelSimulatorComponent,
    SimulatorState,
    SimulatorStateEventTypeEnum,
} from '@crczp/adaptive-instance-simulator';
import { ErrorHandlerService, NotificationService } from '@crczp/utils';

@Component({
    selector: 'crczp-adaptive-definition-simulator-wrapper',
    templateUrl: './adaptive-definition-simulator.component.html',
    styleUrls: ['./adaptive-definition-simulator.component.css'],
    imports: [InstanceModelSimulatorComponent],
})
export class AdaptiveDefinitionSimulatorComponent {
    private errorHandler = inject(ErrorHandlerService);
    private notificationService = inject(NotificationService);

    handleState(event: SimulatorState) {
        if (event && event.state === SimulatorStateEventTypeEnum.ERROR_EVENT) {
            this.errorHandler.emit(event?.error, event.message);
        } else if (event) {
            this.notificationService.emit('success', event.message);
        }
    }
}
