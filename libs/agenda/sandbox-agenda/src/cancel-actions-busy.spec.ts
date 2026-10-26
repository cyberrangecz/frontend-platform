import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import {
    AllocationRequestsApi,
    PoolApi,
    SandboxAllocationUnitsApi,
    SandboxInstanceApi,
} from '@crczp/sandbox-api';
import { createPaginatedResource } from '@crczp/api-common';
import { Pool, RequestStageState, SandboxAllocationUnit } from '@crczp/sandbox-model';
import { BusyGuard } from '@crczp/sandbox-agenda/internal';
import {
    ErrorHandlerService,
    LoadingTracker,
    NotificationService,
    PortalConfig,
} from '@crczp/utils';
import { SentinelDialogResultEnum } from '@sentinel/components/dialogs';
import { firstValueFrom, isObservable, NEVER, Observable, of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { PoolDetailControls } from '../pool-detail/components/pool-detail-controls';
import { AbstractSandbox } from '../pool-detail/model/abstract-sandbox';
import { PoolDetailTable } from '../pool-detail/model/pool-detail-table';
import { SandboxAllocationUnitsService } from '../pool-detail/services/state/sandbox-allocation-unit/sandbox-allocation-units.service';
import { SandboxInstanceService } from '../pool-detail/services/state/sandbox-instance/sandbox-instance.service';

vi.mock('@crczp/components', () => {
    class LinkedRow {
        readonly links = new Map<string, string>();
        constructor(
            public element: unknown,
            public actions: unknown[],
        ) {}
        addLink(columnId: string, url: string): void {
            this.links.set(columnId, url);
        }
    }
    class TableModel {
        pagination: unknown;
        constructor(
            readonly rows: LinkedRow[],
            readonly columns: unknown[],
        ) {}
    }
    return { LinkedRow, TableModel };
});

vi.mock('@sentinel/components/table', () => {
    class RowAction {
        constructor(
            public id: string,
            public label: string,
            public matIcon: string,
            public matColor: string,
            public tooltip: string,
            public disabled$: unknown,
            public result$: unknown,
        ) {}
    }
    class DeleteAction extends RowAction {
        constructor(tooltip: string, disabled$: unknown, result$: unknown) {
            super('delete', 'Delete', 'delete', 'warn', tooltip, disabled$, result$);
        }
    }
    class Row {
        constructor(
            public element: unknown,
            public actions: RowAction[],
        ) {}
        addLink(): void {
            // The link is not under test.
        }
    }
    class Column {}
    class SentinelTable {
        pagination: unknown;
        constructor(
            public rows: Row[],
            public columns: Column[],
        ) {}
    }
    return { Column, DeleteAction, Row, RowAction, SentinelTable };
});

const PORTAL_CONFIG = {
    defaultPageSize: 10,
    polling: { pollingPeriodShortMs: 1000, retryCount: 1 },
};

function createRunningSandbox(): AbstractSandbox {
    return new AbstractSandbox({
        id: 5,
        comment: '',
        locked: false,
        sandboxUuid: '',
        poolId: 7,
        createdBy: { fullName: 'Organizer' },
        allocationRequest: {
            id: 31,
            createdAt: new Date(),
            stages: [RequestStageState.RUNNING],
        },
        cleanupRequest: null,
    } as never);
}

function createPool(): Pool {
    const pool = new Pool();
    pool.id = 7;
    pool.maxSize = 4;
    return pool;
}

interface Harness {
    service: SandboxInstanceService;
    cancelAllocationsRequest$: Subject<never[]>;
    cancelRequest$: Subject<{ stopPending: boolean }>;
}

function createHarness(): Harness {
    const tracker = new LoadingTracker();
    const cancelAllocationsRequest$ = new Subject<never[]>();
    const cancelRequest$ = new Subject<{ stopPending: boolean }>();
    TestBed.configureTestingModule({
        providers: [
            SandboxInstanceService,
            { provide: PortalConfig, useValue: PORTAL_CONFIG },
            { provide: SandboxInstanceApi, useValue: {} },
            { provide: PoolApi, useValue: {} },
            { provide: SandboxAllocationUnitsApi, useValue: {} },
            { provide: AllocationRequestsApi, useValue: { cancel: () => cancelRequest$ } },
            {
                provide: SandboxAllocationUnitsService,
                useValue: {
                    isDeleting$: tracker.isLoading$,
                    trackDeletion: <T>(request: () => Observable<T>) => tracker.trackRequest(request),
                    units$: NEVER,
                    hasError$: NEVER,
                    isLoading$: NEVER,
                    refresh: () => of(createPaginatedResource<SandboxAllocationUnit>(10)),
                    cancelAllocations: () => cancelAllocationsRequest$,
                },
            },
            { provide: Router, useValue: {} },
            {
                provide: MatDialog,
                useValue: { open: () => ({ afterClosed: () => of(SentinelDialogResultEnum.CONFIRMED) }) },
            },
            { provide: NotificationService, useValue: { emit: vi.fn() } },
            { provide: ErrorHandlerService, useValue: { emitAPIError: vi.fn() } },
        ],
    });
    return {
        service: TestBed.inject(SandboxInstanceService),
        cancelAllocationsRequest$,
        cancelRequest$,
    };
}

function readCancelAllocationsDisabled(service: SandboxInstanceService): Promise<boolean> {
    const controls = PoolDetailControls.create(
        createPool(),
        [createRunningSandbox()],
        service,
        new BusyGuard(service.isDeleting$).renew(),
    );
    const disabled = controls[2].disabled$;
    return firstValueFrom(isObservable(disabled) ? disabled : of(disabled()));
}

function readCancelBuildDisabled(service: SandboxInstanceService): Promise<boolean> {
    const table = new PoolDetailTable(
        { ...createPaginatedResource<AbstractSandbox>(10), elements: [createRunningSandbox()] },
        service,
        false,
        new BusyGuard(service.isDeleting$).renew(),
    );
    const action = table.rows[0].actions.find((rowAction) => 'id' in rowAction && rowAction.id === 'cancel_build');
    return firstValueFrom((action as { disabled$: Observable<boolean> }).disabled$);
}

describe('Cancel actions while their request is in flight', () => {
    it('keep Cancel all allocations enabled while nothing runs', async () => {
        expect(await readCancelAllocationsDisabled(createHarness().service)).toBe(false);
    });

    it('disable Cancel all allocations from the confirmation until the request ends', async () => {
        const { service, cancelAllocationsRequest$ } = createHarness();
        service.cancelAllocations(7).subscribe();

        expect(await readCancelAllocationsDisabled(service)).toBe(true);

        cancelAllocationsRequest$.next([]);
        cancelAllocationsRequest$.complete();

        expect(await readCancelAllocationsDisabled(service)).toBe(false);
    });

    it('keep Cancel build enabled while nothing runs', async () => {
        expect(await readCancelBuildDisabled(createHarness().service)).toBe(false);
    });

    it('disable Cancel build from the confirmation until the request ends', async () => {
        const { service, cancelRequest$ } = createHarness();
        service.cancelBuild(createRunningSandbox()).subscribe();

        expect(await readCancelBuildDisabled(service)).toBe(true);

        cancelRequest$.next({ stopPending: false });
        cancelRequest$.complete();

        expect(await readCancelBuildDisabled(service)).toBe(false);
    });

    it('enable both again after the request fails', async () => {
        const { service, cancelRequest$ } = createHarness();
        service.cancelBuild(createRunningSandbox()).subscribe({ error: () => undefined });
        cancelRequest$.error(new Error('failed'));

        expect(await readCancelBuildDisabled(service)).toBe(false);
        expect(await readCancelAllocationsDisabled(service)).toBe(false);
    });
});
