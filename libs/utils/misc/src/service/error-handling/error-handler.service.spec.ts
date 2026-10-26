import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SentinelNotification, SentinelNotificationResult, SentinelNotificationService } from '@sentinel/layout/notification';
import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalConfig } from '../../types/config';
import { ErrorHandlerService } from './error-handler.service';

const TRAINING_BASE_PATH = 'https://platform.test/training/api/v1/';
const USER_AND_GROUP_BASE_PATH = 'https://platform.test/user-and-group/api/v1/';

describe('ErrorHandlerService Java API error notifications', () => {
    let emittedNotifications: SentinelNotification[];
    let service: ErrorHandlerService;

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        emittedNotifications = [];
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: PortalConfig,
                    useValue: {
                        basePaths: {
                            linearTraining: TRAINING_BASE_PATH,
                            userAndGroup: USER_AND_GROUP_BASE_PATH,
                            sandbox: 'https://platform.test/sandbox/api/v1/',
                        },
                    },
                },
                {
                    provide: SentinelNotificationService,
                    useValue: {
                        emit: (notification: SentinelNotification) => {
                            emittedNotifications.push(notification);
                            return of(SentinelNotificationResult.CONFIRMED);
                        },
                    },
                },
                { provide: Router, useValue: { events: EMPTY } },
            ],
        });
        service = TestBed.inject(ErrorHandlerService);
    });

    function failWith(url: string, body: unknown): void {
        const response = new HttpErrorResponse({ url, status: 400, statusText: 'Bad Request', error: body });
        service.emitAPIError(response, 'Operation').subscribe();
    }

    it('shows the message of the service own error body', () => {
        failWith(TRAINING_BASE_PATH + 'runs', { message: 'Own message', detail: 'ignored', title: 'ignored' });

        expect(emittedNotifications[0]?.additionalInfo).toEqual(['Own message']);
    });

    it('shows the detail of a problem detail body', () => {
        failWith(USER_AND_GROUP_BASE_PATH + 'groups', {
            type: 'about:blank',
            title: 'Bad Request',
            status: 400,
            detail: 'Failed to read request',
            instance: '/groups',
        });

        expect(emittedNotifications[0]?.additionalInfo).toEqual(['Failed to read request']);
    });

    it('falls back to the title of a problem detail body without detail', () => {
        failWith(TRAINING_BASE_PATH + 'runs', { type: 'about:blank', title: 'Method Not Allowed', status: 405 });

        expect(emittedNotifications[0]?.additionalInfo).toEqual(['Method Not Allowed']);
    });

    it('falls back to the transport message when a problem detail body holds neither detail nor title', () => {
        failWith(TRAINING_BASE_PATH + 'runs', { status: 500, detail: '', title: '' });

        expect(emittedNotifications[0]?.additionalInfo?.[0]).toContain('Http failure response');
    });

    it('shows a text body as is', () => {
        failWith(TRAINING_BASE_PATH + 'runs', 'Plain text failure');

        expect(emittedNotifications[0]?.additionalInfo).toEqual(['Plain text failure']);
    });
});
