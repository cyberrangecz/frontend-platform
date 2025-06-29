import { fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { CleanupRequestsApi, PoolApi, SandboxAllocationUnitsApi } from 'libs/api/sandbox-api/src';
import { throwError } from 'rxjs';
import { skip } from 'rxjs/operators';
import {
    createCleanupRequestApiSpy,
    createContextSpy,
    createErrorHandlerSpy,
    createMatDialogSpy,
    createNotificationSpy,
    createPoolApiSpy,
    createSauApiSpy,
} from 'libs/agenda/sandbox-agenda/internal/src/testing/testing-commons.spec';
import { CleanupRequestsConcreteService } from 'libs/agenda/sandbox-agenda/pool-detail/src/services/state/request/cleanup/cleanup-requests-concrete.service';
import { SandboxAgendaContext } from 'libs/agenda/sandbox-agenda/internal/src/services/sandox-agenda-context.service';
import { SandboxErrorHandler } from 'libs/agenda/sandbox-agenda/src/sandbox-error-handler.service';
import { SandboxNotificationService } from 'libs/agenda/sandbox-agenda/src/sandbox-notification.service';

describe('PoolCleanupRequestsConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let notificationSpy: jasmine.SpyObj<SandboxNotificationService>;
    let contextSpy: jasmine.SpyObj<SandboxAgendaContext>;
    let poolApiSpy: jasmine.SpyObj<PoolApi>;
    let sauApiSpy: jasmine.SpyObj<SandboxAllocationUnitsApi>;
    let cleanupRequestsApiSpy: jasmine.SpyObj<CleanupRequestsApi>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let service: CleanupRequestsConcreteService;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        poolApiSpy = createPoolApiSpy();
        sauApiSpy = createSauApiSpy();
        cleanupRequestsApiSpy = createCleanupRequestApiSpy();
        contextSpy = createContextSpy();
        dialogSpy = createMatDialogSpy();

        TestBed.configureTestingModule({
            providers: [
                CleanupRequestsConcreteService,
                { provide: PoolApi, useValue: poolApiSpy },
                { provide: CleanupRequestsApi, cleanupRequestsApiSpy },
                { provide: SandboxAllocationUnitsApi, useValue: sauApiSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SandboxErrorHandler, useValue: errorHandlerSpy },
                { provide: SandboxNotificationService, useValue: notificationSpy },
                { provide: SandboxAgendaContext, useValue: contextSpy },
            ],
        });
        service = TestBed.inject(CleanupRequestsConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load data from facade (called once)', (done) => {
        const pagination = createPagination();
        poolApiSpy.getCleanupRequests.and.returnValue(asyncData(null));

        service.getAll(0, pagination).subscribe(() => done(), fail);
        expect(poolApiSpy.getCleanupRequests).toHaveBeenCalledTimes(1);
    });

    it('should emit next value on update (request)', (done) => {
        const pagination = createPagination();
        const mockData = createMock();
        poolApiSpy.getCleanupRequests.and.returnValue(asyncData(mockData));

        service.resource$.pipe(skip(1)).subscribe((emitted) => {
            expect(emitted).toEqual(mockData);
            done();
        }, fail);
        service.getAll(0, pagination).subscribe((_) => _, fail);
    });

    it('should call error handler on err', (done) => {
        const pagination = createPagination();
        poolApiSpy.getCleanupRequests.and.returnValue(throwError(null));

        service.getAll(0, pagination).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    it('should emit hasError observable on err', (done) => {
        const pagination = createPagination();
        poolApiSpy.getCleanupRequests.and.returnValue(throwError(null));
        service.hasError$
            .pipe(
                skip(2), // we ignore initial value and value emitted before the call is made
            )
            .subscribe(
                (hasError) => {
                    expect(hasError).toBeTruthy();
                    done();
                },
                () => fail,
            );
        service.getAll(0, pagination).subscribe(
            () => fail,
            (_) => _,
        );
    });

    it('should start polling', fakeAsync(() => {
        const mockData = createMock();
        poolApiSpy.getCleanupRequests.and.returnValue(asyncData(mockData));

        const subscription = service.resource$.subscribe();
        assertPoll(1);
        subscription.unsubscribe();
    }));

    it('should stop polling on error', fakeAsync(() => {
        const mockData = createMock();
        // throw error on third call
        poolApiSpy.getCleanupRequests.and.returnValues(asyncData(mockData), asyncData(mockData), throwError(null));

        const subscription = service.resource$.subscribe();
        assertPoll(3);
        tick(5 * contextSpy.config.pollingPeriod);
        expect(poolApiSpy.getCleanupRequests).toHaveBeenCalledTimes(3);
        subscription.unsubscribe();
    }));

    it('should start polling again after request is successful', fakeAsync(() => {
        const pagination = createPagination();
        const mockData = createMock();
        poolApiSpy.getCleanupRequests.and.returnValues(
            asyncData(mockData),
            asyncData(mockData),
            throwError(null),
            asyncData(mockData),
            asyncData(mockData),
            asyncData(mockData),
        );

        const subscription = service.resource$.subscribe();
        expect(poolApiSpy.getCleanupRequests).toHaveBeenCalledTimes(0);
        assertPoll(3);
        tick(contextSpy.config.pollingPeriod);
        expect(poolApiSpy.getCleanupRequests).toHaveBeenCalledTimes(3);
        tick(5 * contextSpy.config.pollingPeriod);
        expect(poolApiSpy.getCleanupRequests).toHaveBeenCalledTimes(3);
        service.getAll(0, pagination).subscribe();
        expect(poolApiSpy.getCleanupRequests).toHaveBeenCalledTimes(4);
        assertPoll(3, 4);
        subscription.unsubscribe();
    }));

    function createPagination(): OffsetPaginationEvent {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }

    function createMock() {
        return new PaginatedResource([], new OffsetPagination(1, 0, 5, 5, 1));
    }

    function assertPoll(times: number, initialHaveBeenCalledTimes = 0): void {
        let calledTimes = initialHaveBeenCalledTimes;
        for (let i = 0; i < times; i++) {
            tick(contextSpy.config.pollingPeriod);
            calledTimes = calledTimes + 1;
            expect(poolApiSpy.getCleanupRequests).toHaveBeenCalledTimes(calledTimes);
        }
    }
});
