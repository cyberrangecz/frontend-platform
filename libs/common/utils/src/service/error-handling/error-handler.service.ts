import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, inject, Injectable } from '@angular/core';
import {
    SentinelNotification,
    SentinelNotificationResult,
    SentinelNotificationService,
    SentinelNotificationTypeEnum
} from '@sentinel/layout/notification';
import { Observable, of, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { PortalConfig } from '../../types/config';
import { Event, NavigationError, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
/**
 * Resolves type of error and emits alert with appropriate message
 */
export class ErrorHandlerService implements ErrorHandler {
    private config = inject(PortalConfig);
    private notificationService = inject(SentinelNotificationService);
    private router = inject(Router);

    private navigationErrorSubject = new Subject<NavigationError>();
    public navigationError$ = this.navigationErrorSubject.asObservable();

    constructor() {
        this.setupNavigationErrorHandling();
    }

    handleError(error: any) {
        this.emitFrontendErrorNotification(
            error?.toString() || 'Unknown error',
            'ErrorHandler'
        );
    }

    emitNavigationError(error: any, url?: string): Observable<boolean> {
        const notification: SentinelNotification = {
            type: SentinelNotificationTypeEnum.Error,
            title: 'Navigation',
            source: url || 'Unknown url',
            additionalInfo: [
                'Unable to navigate to the requested page.',
                error?.message || 'Unknown navigation error',
            ],
        };

        return this.safeEmit(this.notificationService, 'emit', notification);
    }

    emitAPIError(
        err: HttpErrorResponse,
        operation: string,
        action?: string
    ): Observable<boolean> {
        const notification: SentinelNotification = {
            type: SentinelNotificationTypeEnum.Error,
            title: operation,
        };
        if (action !== undefined) {
            notification.action = action;
        }

        if (
            err === null ||
            err === undefined ||
            err.status === 0 ||
            err.error === null ||
            err.error === undefined
        ) {
            const msg = err?.message || '';
            notification.additionalInfo = [
                'Unknown error. Please check your internet connection or report the issue to developers',
                msg.toString(),
            ];
            this.checkForClockSyncErr(err, notification);
            return this.safeEmit(
                this.notificationService,
                'emit',
                notification
            );
        }

        if (
            err.url?.startsWith(this.config.basePaths.linearTraining) ||
            err.url?.startsWith(this.config.basePaths.adaptiveTraining)
        ) {
            this.setJavaApiErrorNotification(err, notification);
            notification.source = 'Training Agenda';
        } else if (err.url?.startsWith(this.config.basePaths.userAndGroup)) {
            this.setJavaApiErrorNotification(err, notification);
            notification.source = 'User & Group Agenda';
        } else if (err.url?.startsWith(this.config.basePaths.sandbox)) {
            this.setPythonApiErrorToNotification(err, notification);
            notification.source = 'Sandbox Agenda';
        } else {
            notification.additionalInfo = [
                'Failed with unsupported error message. Please report the following message to developers',
                err?.message?.toString(),
            ];
        }

        return this.safeEmit(this.notificationService, 'emit', notification);
    }

    emitFrontendErrorNotification(
        message: string,
        source?: string
    ): Observable<boolean> {
        console.error(`${source || 'Error'}: ${message}`);
        return this.safeEmit(this.notificationService, 'emit', {
            type: SentinelNotificationTypeEnum.Error,
            title: source || 'Error',
            additionalInfo: [message],
        });
    }

    /**
     * Safely invokes a method that should return Observable<SentinelNotificationResult>.
     * Falls back to `of(false)` if the method is missing or throws.
     */
    private safeEmit(
        service: any,
        method: string,
        payload: SentinelNotification
    ): Observable<boolean> {
        if (typeof service?.[method] !== 'function') {
            return of(false);
        }
        try {
            return service[method](payload).pipe(
                map((r: any) => r === SentinelNotificationResult.CONFIRMED)
            );
        } catch {
            return of(false);
        }
    }

    private setupNavigationErrorHandling(): void {
        this.router.events
            .pipe(
                filter(
                    (event: Event): event is NavigationError =>
                        event instanceof NavigationError
                )
            )
            .subscribe((errorEvent: NavigationError) => {
                this.navigationErrorSubject.next(errorEvent);
                this.emitNavigationError(errorEvent.error, errorEvent.url);
            });
    }

    private setJavaApiErrorNotification(
        err: HttpErrorResponse,
        notification: SentinelNotification
    ) {
        notification.additionalInfo = [err.error.message];
    }

    private setPythonApiErrorToNotification(
        err: HttpErrorResponse,
        notification: SentinelNotification
    ) {
        if (err.error.detail) {
            notification.additionalInfo = [err.error.detail];
        } else if (err.error.non_field_errors) {
            notification.additionalInfo = [err.error.non_field_errors];
        }
    }

    private checkForClockSyncErr(
        err: HttpErrorResponse | string,
        notification: SentinelNotification
    ) {
        if (err === 'Token has expired') {
            notification.source = err;
            notification.additionalInfo = [
                'Failed due to an expired authentication. Please, make sure your local date and time is correct.',
            ];
        }
    }
}
