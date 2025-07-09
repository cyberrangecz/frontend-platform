import {Injectable} from '@angular/core';
import {
    SentinelNotification,
    SentinelNotificationResult,
    SentinelNotificationService,
    SentinelNotificationTypeEnum,
} from '@sentinel/layout/notification';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

/**
 * Global service emitting alert events.
 */
@Injectable()
export class NotificationService {
    constructor(private layoutNotificationService: SentinelNotificationService) {}

    /**
     * Adds new alert to the queue and if its the only element in queue calls method to display it.
     * @param type type of alert
     * @param message alert to display to user
     * @param action name of the action button displayed in the notification
     * @param duration how long should the alert be displayed.
     *  In millis, use 0 if it should be displayed until users clicks on button
     *  Returns observable.
     *  Value of the observable is true if the provided action was selected, false otherwise (no reaction or dismissed)
     */
    emit(type: 'success' | 'error' | 'warning' | 'info', message: string, action?: string): Observable<boolean> {
        const notification: SentinelNotification = {
            type: this.convertNotificationType(type),
            duration: 5000,
            title: message,
        };
        if (action !== undefined) {
            notification.action = action;
        }
        return this.layoutNotificationService
            .emit(notification)
            .pipe(map((result) => result === SentinelNotificationResult.CONFIRMED));
    }

    private convertNotificationType(type: 'success' | 'error' | 'warning' | 'info'): SentinelNotificationTypeEnum {
        switch (type) {
            case 'warning':
                return SentinelNotificationTypeEnum.Warning;
            case 'error':
                return SentinelNotificationTypeEnum.Error;
            case 'success':
                return SentinelNotificationTypeEnum.Success;
            default:
                return SentinelNotificationTypeEnum.Info;
        }
    }
}
