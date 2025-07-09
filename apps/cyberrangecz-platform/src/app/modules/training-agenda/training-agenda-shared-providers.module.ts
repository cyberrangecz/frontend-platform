import {NgModule} from '@angular/core';
import {TrainingErrorHandler, TrainingNotificationService} from '@crczp/training-agenda';
import {ErrorHandlerService} from '../../services/shared/error-handler.service';
import {NotificationService} from '../../services/shared/notification.service';

@NgModule({
    providers: [
        { provide: TrainingErrorHandler, useClass: ErrorHandlerService },
        { provide: TrainingNotificationService, useClass: NotificationService },
    ],
})
export class TrainingAgendaSharedProvidersModule {}
