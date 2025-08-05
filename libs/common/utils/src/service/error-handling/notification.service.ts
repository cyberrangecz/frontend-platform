import { inject, Injectable } from '@angular/core';
import {
    SentinelNotificationResult,
    SentinelNotificationService,
    SentinelNotificationTypeEnum
} from '@sentinel/layout/notification';
import { map } from 'rxjs/operators';

/**
 * Global service emitting alert events.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
    private readonly layoutNotificationService = inject(
        SentinelNotificationService
    );

    public emit(
        type: 'success' | 'error' | 'warning' | 'info',
        title: string,
        additionalInfo?: string[],
        source?: string,
        duration?: number,
        action?: string
    ) {
        const sentinelType = this.convertNotificationType(type);
        return this.layoutNotificationService
            .emit({
                title,
                type: sentinelType,
                additionalInfo,
                source,
                duration,
                action,
            })
            .pipe(
                map((result) => result === SentinelNotificationResult.CONFIRMED)
            );
    }

    private convertNotificationType(
        type: 'success' | 'error' | 'warning' | 'info'
    ): SentinelNotificationTypeEnum {
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
