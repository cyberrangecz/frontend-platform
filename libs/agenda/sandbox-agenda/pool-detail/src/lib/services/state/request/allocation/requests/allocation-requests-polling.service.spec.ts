import { fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { SentinelDialogResultEnum } from '@sentinel/components/dialogs';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPagination, PaginatedResource } from '@sentinel/common/pagination';
import { AllocationRequestsApi, PoolApi, SandboxAllocationUnitsApi } from 'libs/api/sandbox-api/src';
import { AllocationRequest } from 'libs/model/sandbox-model/src';
import { of, throwError } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import {
    createAllocationRequestApiSpy,
    createContextSpy,
    createErrorHandlerSpy,
    createMatDialogSpy,
    createNotificationSpy,
    createPagination,
    createPoolApiSpy,
    createSauApiSpy,
} from '../../../../../../../../internal/src/lib/testing/testing-commons.spec';
import { SandboxErrorHandler } from '../../../../../../../../src/lib/sandbox-error-handler.service';
import { SandboxNotificationService } from '../../../../../../../../src/lib/sandbox-notification.service';
import { SandboxAgendaContext } from '../../../../../../../../internal/src/lib/services/sandox-agenda-context.service';
import { AllocationRequestsConcreteService } from './allocation-requests-concrete.service';

describe('PoolAllocationRequestsPollingService', () => {
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let notificationSpy: jasmine.SpyObj<SandboxNotificationService>;
    let allocationRequestsApiSpy: jasmine.SpyObj<AllocationRequestsApi>;
    let sauApiSpy: jasmine.SpyObj<SandboxAllocationUnitsApi>;
    let poolApiSpy: jasmine.SpyObj<PoolApi>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let contextSpy: jasmine.SpyObj<SandboxAgendaContext>;

    let service: AllocationRequestsConcreteService;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        allocationRequestsApiSpy = createAllocationRequestApiSpy();
        sauApiSpy = createSauApiSpy();
        poolApiSpy = createPoolApiSpy();
        contextSpy = createContextSpy();
        dialogSpy = createMatDialogSpy();
        TestBed.configureTestingModule({
            providers: [
                AllocationRequestsConcreteService,
                { provide: AllocationRequestsApi, useValue: allocationRequestsApiSpy },
                { provide: PoolApi, useValue: poolApiSpy },
                { provide: SandboxAllocationUnitsApi, useValue: sauApiSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SandboxAgendaContext, useValue: contextSpy },
                { provide: SandboxNotificationService, useValue: notificationSpy },
                { provide: SandboxErrorHandler, useValue: errorHandlerSpy },
            ],
        });
        service = TestBed.inject(AllocationRequestsConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call api to get allocation requests', (done) => {
        const pagination = createPagination();
        poolApiSpy.getAllocationRequests.and.returnValue(asyncData(null));

        service
            .getAll(0, pagination)
            .pipe(take(1))
            .subscribe(
                () => {
                    expect(poolApiSpy.getAllocationRequests).toHaveBeenCalledTimes(1);
                    done();
                },
                () => fail,
            );
    });

    it('should emit next value when data received from api', (done) => {
        const pagination = createPagination();
        const mockData = createMock();
        poolApiSpy.getAllocationRequests.and.returnValue(asyncData(mockData));

        service.resource$.pipe(skip(1), take(1)).subscribe(
            (emitted) => {
                expect(emitted).toBe(mockData);
                done();
            },
            () => fail(),
        );
        service.getAll(0, pagination).subscribe();
    });

    it('should call error handler on err', (done) => {
        const pagination = createPagination();
        poolApiSpy.getAllocationRequests.and.returnValue(throwError({ status: 400 }));

        service
            .getAll(0, pagination)
            .pipe(take(1))
            .subscribe(
                () => fail(),
                () => {
                    expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                    done();
                },
            );
    });

    it('should open dialog and call api if confirmed on cancel', (done) => {
        dialogSpy.open.and.returnValue({ afterClosed: () => of(SentinelDialogResultEnum.CONFIRMED) } as any);
        const mockData = createMock();
        const request = new AllocationRequest();
        request.id = 0;
        poolApiSpy.getAllocationRequests.and.returnValue(asyncData(mockData));
        allocationRequestsApiSpy.cancel.and.returnValue(asyncData(null));

        service
            .cancel(request)
            .pipe(take(1))
            .subscribe(
                () => {
                    expect(dialogSpy.open).toHaveBeenCalledTimes(1);
                    expect(allocationRequestsApiSpy.cancel).toHaveBeenCalledTimes(1);
                    done();
                },
                () => fail(),
            );
    });

    it('should open dialog and not call api if dialog dismissed on cancel', (done) => {
        dialogSpy.open.and.returnValue({ afterClosed: () => of(SentinelDialogResultEnum.DISMISSED) } as any);
        const mockData = createMock();
        const request = new AllocationRequest();
        request.id = 0;
        poolApiSpy.getAllocationRequests.and.returnValue(asyncData(mockData));
        allocationRequestsApiSpy.cancel.and.returnValue(asyncData(null));

        service
            .cancel(request)
            .pipe(take(1))
            .subscribe(
                () => fail(),
                () => fail(),
                () => {
                    expect(dialogSpy.open).toHaveBeenCalledTimes(1);
                    expect(allocationRequestsApiSpy.cancel).toHaveBeenCalledTimes(0);
                    done();
                },
            );
    });

    it('should start polling', fakeAsync(() => {
        const mockData = createMock();
        poolApiSpy.getAllocationRequests.and.returnValue(asyncData(mockData));

        const subscription = service.resource$.subscribe();
        assertPoll(1);
        subscription.unsubscribe();
    }));

    it('should stop polling on error', fakeAsync(() => {
        const mockData = createMock();
        poolApiSpy.getAllocationRequests.and.returnValues(
            asyncData(mockData),
            asyncData(mockData),
            throwError({ status: 400 }),
        ); // throw error on third call

        const subscription = service.resource$.subscribe();
        assertPoll(3);
        tick(5 * contextSpy.config.pollingPeriod);
        expect(poolApiSpy.getAllocationRequests).toHaveBeenCalledTimes(3);
        subscription.unsubscribe();
    }));

    it('should start polling again after request is successful', fakeAsync(() => {
        const pagination = createPagination();
        const mockData = createMock();
        poolApiSpy.getAllocationRequests.and.returnValues(
            asyncData(mockData),
            asyncData(mockData),
            throwError({ status: 400 }),
            asyncData(mockData),
            asyncData(mockData),
            asyncData(mockData),
        );

        const subscription = service.resource$.subscribe();
        expect(poolApiSpy.getAllocationRequests).toHaveBeenCalledTimes(0);
        assertPoll(3);
        tick(contextSpy.config.pollingPeriod);
        expect(poolApiSpy.getAllocationRequests).toHaveBeenCalledTimes(3);
        tick(5 * contextSpy.config.pollingPeriod);
        expect(poolApiSpy.getAllocationRequests).toHaveBeenCalledTimes(3);
        service.getAll(0, pagination).subscribe();
        expect(poolApiSpy.getAllocationRequests).toHaveBeenCalledTimes(4);
        assertPoll(3, 4);
        subscription.unsubscribe();
    }));

    function createMock() {
        return new PaginatedResource([], new OffsetPagination(1, 0, 5, 5, 1));
    }

    function assertPoll(times: number, initialHaveBeenCalledTimes = 0): void {
        let calledTimes = initialHaveBeenCalledTimes;
        for (let i = 0; i < times; i++) {
            tick(contextSpy.config.pollingPeriod);
            calledTimes = calledTimes + 1;
            expect(poolApiSpy.getAllocationRequests).toHaveBeenCalledTimes(calledTimes);
        }
    }
});
