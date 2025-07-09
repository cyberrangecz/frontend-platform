import {NgModule} from '@angular/core';
import {UserAndGroupErrorHandler, UserAndGroupNotificationService} from '@crczp/user-and-group-agenda';
import {ErrorHandlerService} from '../../services/shared/error-handler.service';
import {NotificationService} from '../../services/shared/notification.service';

@NgModule({
    providers: [
        { provide: UserAndGroupErrorHandler, useClass: ErrorHandlerService },
        { provide: UserAndGroupNotificationService, useClass: NotificationService },
    ],
})
export class UserAndGroupSharedProvidersModule {}
