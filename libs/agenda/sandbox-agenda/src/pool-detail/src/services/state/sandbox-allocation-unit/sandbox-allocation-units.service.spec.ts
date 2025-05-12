import { TestBed } from '@angular/core/testing';
import { SandboxErrorHandler, SandboxNotificationService } from '@crczp/sandbox-agenda';
import { AllocationRequestsApi, PoolApi, SandboxAllocationUnitsApi } from '@crczp/sandbox-api';
import {
    createAllocationRequestApiSpy,
    createContextSpy,
    createErrorHandlerSpy,
    createMatDialogSpy,
    createNotificationSpy,
    createPagination,
    createPoolApiSpy,
    createResourcePollingServiceSpy,
    createSauApiSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { MatDialog } from '@angular/material/dialog';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPagination, PaginatedResource } from '@sentinel/common/pagination';
import { skip, take } from 'rxjs/operators';
import { SandboxAllocationUnitsConcreteService } from './sandbox-allocation-units-concrete.service';
import { SandboxAgendaContext } from '../../../../../internal/src/services/sandox-agenda-context.service';
import { EMPTY, throwError } from 'rxjs';
import { ResourcePollingService } from '../../../../../internal/src/services/resource-polling.service';

describe('SandboxAllocationUnitsService', () => {
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let notificationSpy: jasmine.SpyObj<SandboxNotificationService>;
    let allocationRequestsApiSpy: jasmine.SpyObj<AllocationRequestsApi>;
    let resourcePollingServiceSpy: jasmine.SpyObj<ResourcePollingService>;
    let sauApiSpy: jasmine.SpyObj<SandboxAllocationUnitsApi>;
    let contextSpy: jasmine.SpyObj<SandboxAgendaContext>;
    let poolApiSpy: jasmine.SpyObj<PoolApi>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;

    let service: SandboxAllocationUnitsConcreteService;

    beforeEach(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        allocationRequestsApiSpy = createAllocationRequestApiSpy();
        resourcePollingServiceSpy = createResourcePollingServiceSpy();
        sauApiSpy = createSauApiSpy();
        poolApiSpy = createPoolApiSpy();
        contextSpy = createContextSpy();
        dialogSpy = createMatDialogSpy();
        TestBed.configureTestingModule({
            providers: [
                SandboxAllocationUnitsConcreteService,
                { provide: AllocationRequestsApi, useValue: allocationRequestsApiSpy },
                { provide: ResourcePollingService, useValue: resourcePollingServiceSpy },
                { provide: PoolApi, useValue: poolApiSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SandboxAllocationUnitsApi, useValue: sauApiSpy },
                { provide: SandboxAgendaContext, useValue: contextSpy },
                { provide: SandboxNotificationService, useValue: notificationSpy },
                { provide: SandboxErrorHandler, useValue: errorHandlerSpy },
            ],
        });
        service = TestBed.inject(SandboxAllocationUnitsConcreteService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call api to get sandbox allocation units', (done) => {
        const pagination = createPagination();
        const mockData = createMock();
        poolApiSpy.getPoolsSandboxAllocationUnits.and.returnValue(asyncData(mockData));
        resourcePollingServiceSpy.startPolling.and.returnValues(asyncData(mockData));

        service
            .getAll(0, pagination)
            .pipe(take(1))
            .subscribe(
                () => {
                    expect(poolApiSpy.getPoolsSandboxes).toHaveBeenCalledTimes(1);
                    done();
                },
                () => fail,
            );
    });

    it('should emit next value when data received from api', () => {
        const pagination = createPagination();
        const mockData = createMock();
        poolApiSpy.getPoolsSandboxAllocationUnits.and.returnValue(asyncData(mockData));
        resourcePollingServiceSpy.startPolling.and.returnValues(asyncData(mockData));

        service.units$.pipe(skip(1), take(1)).subscribe(
            (emitted) => {
                expect(emitted).toBe(mockData);
            },
            () => fail(),
        );
        service.getAll(0, pagination).subscribe();
    });

    it('should call error handler on err from polling service', (done) => {
        const pagination = createPagination();
        poolApiSpy.getPoolsSandboxAllocationUnits.and.returnValue(throwError({ status: 404 }));
        resourcePollingServiceSpy.startPolling.and.returnValues(throwError({ status: 404 }));

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

    it('should not call error handler on first error occurrence', (done) => {
        const pagination = createPagination();
        poolApiSpy.getPoolsSandboxAllocationUnits.and.returnValue(throwError({ status: 404 }));
        resourcePollingServiceSpy.startPolling.and.returnValues(asyncData(EMPTY));

        service
            .getAll(0, pagination)
            .pipe(take(1))
            .subscribe(
                () => {
                    expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(0);
                    done();
                },
                () => fail(),
            );
    });

    // it('should open dialog and call api if confirmed on creation of cleanup request', (done) => {
    //   dialogSpy.open.and.returnValue({ afterClosed: () => of(SentinelDialogResultEnum.CONFIRMED) } as any);
    //   const mockData = createMock();
    //
    //   poolApiSpy.getPoolsSandboxAllocationUnits.and.returnValue(asyncData(mockData));
    //   sauApiSpy.createCleanupRequest.and.returnValue(asyncData(null));
    //   service
    //     .cleanupMultiple(0, [], true)
    //     .pipe(take(1))
    //     .subscribe(
    //       () => {
    //         expect(dialogSpy.open).toHaveBeenCalledTimes(1);
    //         expect(sauApiSpy.createCleanupRequest).toHaveBeenCalledTimes(1);
    //         done();
    //       },
    //       () => fail()
    //     );
    // });

    // it('should open dialog and not call api if dialog dismissed on creation of cleanup request', (done) => {
    //   dialogSpy.open.and.returnValue({ afterClosed: () => of(SentinelDialogResultEnum.DISMISSED) } as any);
    //   const mockData = createMock();
    //   const request = new AllocationRequest();
    //   request.id = 0;
    //   poolApiSpy.getPoolsSandboxAllocationUnits.and.returnValue(asyncData(mockData));
    //   sauApiSpy.createCleanupRequest.and.returnValue(asyncData(null));

    //   service
    //     .cleanup(request)
    //     .pipe(take(1))
    //     .subscribe(
    //       () => fail(),
    //       () => fail(),
    //       () => {
    //         expect(dialogSpy.open).toHaveBeenCalledTimes(1);
    //         expect(sauApiSpy.createCleanupRequest).toHaveBeenCalledTimes(0);
    //         done();
    //       }
    //     );
    // });

    function createMock() {
        return new PaginatedResource([], new OffsetPagination(1, 0, 5, 5, 1));
    }
});
