import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import {
    AllocationRequestsApi,
    PoolApi,
    SandboxAllocationUnitsApi,
    SandboxInstanceApi,
    SandboxAllocationUnitSort,
} from '@crczp/sandbox-api';
import { createPaginatedResource } from '@crczp/api-common';
import { SandboxAllocationUnit } from '@crczp/sandbox-model';
import {
    ErrorHandlerService,
    NotificationService,
    OffsetPaginationEvent,
    PollingService,
    PortalConfig,
} from '@crczp/utils';
import { SentinelDialogResultEnum } from '@sentinel/components/dialogs';
import { firstValueFrom, NEVER, Observable, of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AbstractSandbox } from '../pool-detail/model/abstract-sandbox';
import { SandboxAllocationUnitsConcreteService } from '../pool-detail/services/state/sandbox-allocation-unit/sandbox-allocation-units-concrete.service';
import { SandboxAllocationUnitsService } from '../pool-detail/services/state/sandbox-allocation-unit/sandbox-allocation-units.service';
import { SandboxInstanceService } from '../pool-detail/services/state/sandbox-instance/sandbox-instance.service';

const PORTAL_CONFIG = {
    defaultPageSize: 10,
    polling: { pollingPeriodShortMs: 1000, retryCount: 1 },
};

function createSandbox(): AbstractSandbox {
    return new AbstractSandbox({
        id: 5,
        comment: '',
        locked: false,
        sandboxUuid: '',
        poolId: 7,
        createdBy: { fullName: 'Organizer' },
        allocationRequest: { id: 31, createdAt: new Date(), stages: [] },
        cleanupRequest: null,
    } as never);
}

function createInstanceService(
    dialogOpen: ReturnType<typeof vi.fn>,
    refresh: ReturnType<typeof vi.fn>,
    cancel: ReturnType<typeof vi.fn>,
): SandboxInstanceService {
    TestBed.configureTestingModule({
        providers: [
            SandboxInstanceService,
            { provide: PortalConfig, useValue: PORTAL_CONFIG },
            { provide: SandboxInstanceApi, useValue: {} },
            { provide: PoolApi, useValue: {} },
            { provide: SandboxAllocationUnitsApi, useValue: {} },
            { provide: AllocationRequestsApi, useValue: { cancel } },
            {
                provide: SandboxAllocationUnitsService,
                useValue: {
                    isDeleting$: NEVER,
                    trackDeletion: <T>(request: () => Observable<T>) => request(),
                    units$: NEVER,
                    hasError$: NEVER,
                    isLoading$: NEVER,
                    refresh,
                    cancelAllocations: () => of([]),
                },
            },
            { provide: Router, useValue: {} },
            { provide: MatDialog, useValue: { open: dialogOpen } },
            { provide: NotificationService, useValue: { emit: vi.fn() } },
            { provide: ErrorHandlerService, useValue: { emitAPIError: vi.fn() } },
        ],
    });
    return TestBed.inject(SandboxInstanceService);
}

function dialogAnswering(result: SentinelDialogResultEnum) {
    return vi.fn(() => ({ afterClosed: () => of(result) }));
}

describe('Refreshing the units after an action', () => {
    it('refreshes through the units service, which keeps the shown page', async () => {
        const refresh = vi.fn(() => of(createPaginatedResource<SandboxAllocationUnit>(10)));
        const service = createInstanceService(vi.fn(), refresh, vi.fn());

        await firstValueFrom(service.cancelAllocations(7));

        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('refreshes the pool and page of the latest fetch', async () => {
        const getUnits = vi.fn(() => of(createPaginatedResource<SandboxAllocationUnit>(10)));
        TestBed.configureTestingModule({
            providers: [
                SandboxAllocationUnitsConcreteService,
                { provide: PortalConfig, useValue: PORTAL_CONFIG },
                {
                    provide: PoolApi,
                    useValue: {
                        getPoolsSandboxAllocationUnits: getUnits,
                        getPoolsSandboxes: () => of(createPaginatedResource(10)),
                    },
                },
                { provide: SandboxAllocationUnitsApi, useValue: {} },
                { provide: PollingService, useValue: { startPolling: (request$: unknown) => request$ } },
                { provide: MatDialog, useValue: {} },
                { provide: NotificationService, useValue: {} },
                { provide: ErrorHandlerService, useValue: {} },
            ],
        });
        const service = TestBed.inject(SandboxAllocationUnitsConcreteService);
        const thirdPage: OffsetPaginationEvent<SandboxAllocationUnitSort> = { page: 2, size: 10, sort: 'id', sortDir: 'asc' };
        await firstValueFrom(service.getAll(7, thirdPage));
        getUnits.mockClear();

        await firstValueFrom(service.refresh());

        expect(getUnits).toHaveBeenCalledWith(7, thirdPage);
    });
});

describe('Cancel build dialog', () => {
    it('stays closed until the returned stream is subscribed', () => {
        const dialogOpen = dialogAnswering(SentinelDialogResultEnum.DISMISSED);
        const service = createInstanceService(dialogOpen, vi.fn(), vi.fn());

        const cancellation$ = service.cancelBuild(createSandbox());

        expect(dialogOpen).not.toHaveBeenCalled();
        cancellation$.subscribe();
        expect(dialogOpen).toHaveBeenCalledTimes(1);
    });

    it('opens once more for every subscription', () => {
        const dialogOpen = dialogAnswering(SentinelDialogResultEnum.DISMISSED);
        const service = createInstanceService(dialogOpen, vi.fn(), vi.fn());
        const cancellation$ = service.cancelBuild(createSandbox());

        cancellation$.subscribe();
        cancellation$.subscribe();

        expect(dialogOpen).toHaveBeenCalledTimes(2);
    });

    it('cancels the request only after the dialog is confirmed', () => {
        const closed$ = new Subject<SentinelDialogResultEnum>();
        const cancel = vi.fn(() => of({ stopPending: false }));
        const service = createInstanceService(
            vi.fn(() => ({ afterClosed: () => closed$ })),
            vi.fn(() => of(createPaginatedResource<SandboxAllocationUnit>(10))),
            cancel,
        );
        service.cancelBuild(createSandbox()).subscribe();

        expect(cancel).not.toHaveBeenCalled();
        closed$.next(SentinelDialogResultEnum.CONFIRMED);
        expect(cancel).toHaveBeenCalledWith(31);
    });
});
