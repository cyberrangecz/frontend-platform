import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { SandboxErrorHandler, SandboxNavigator, SandboxNotificationService } from '@crczp/sandbox-agenda';
import { PoolApi } from 'libs/api/sandbox-api/src';
import { PoolOverviewConcreteService } from 'libs/agenda/sandbox-agenda/pool-overview/src/services/state/pool-overview/pool-overview-concrete.service';
import { SandboxAgendaContext } from 'libs/agenda/sandbox-agenda/internal/src/services/sandox-agenda-context.service';
import {
    createContextSpy,
    createErrorHandlerSpy,
    createMatDialogSpy,
    createNavigatorSpy,
    createNotificationSpy,
    createPoolApiSpy,
} from 'libs/agenda/sandbox-agenda/internal/src/testing/testing-commons.spec';

describe('PoolOverviewConcreteService', () => {
    let poolApiSpy: jasmine.SpyObj<PoolApi>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let contextSpy: jasmine.SpyObj<SandboxAgendaContext>;
    let navigatorSpy: jasmine.SpyObj<SandboxNavigator>;
    let notificationSpy: jasmine.SpyObj<SandboxNotificationService>;
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let service: PoolOverviewConcreteService;

    beforeEach(waitForAsync(() => {
        poolApiSpy = createPoolApiSpy();
        dialogSpy = createMatDialogSpy();
        contextSpy = createContextSpy();
        navigatorSpy = createNavigatorSpy();
        notificationSpy = createNotificationSpy();
        errorHandlerSpy = createErrorHandlerSpy();

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                PoolOverviewConcreteService,
                { provide: PoolApi, useValue: poolApiSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SandboxAgendaContext, useValue: contextSpy },
                { provide: SandboxNavigator, useValue: navigatorSpy },
                { provide: SandboxNotificationService, useValue: notificationSpy },
                { provide: SandboxErrorHandler, useValue: errorHandlerSpy },
            ],
        });
        service = TestBed.inject(PoolOverviewConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load data from facade', (done) => {
        const pagination = createPagination();
        poolApiSpy.getPools.and.returnValue(asyncData(null));

        service.getAll(pagination).subscribe(() => done(), fail);
        expect(poolApiSpy.getPools).toHaveBeenCalledTimes(1);
    });

    it('should get ssh access', (done) => {
        poolApiSpy.getManagementSshAccess.and.returnValue(asyncData(null));
        service.getSshAccess(0).subscribe(() => done(), fail);
        expect(poolApiSpy.getManagementSshAccess).toHaveBeenCalledTimes(1);
    });

    function createPagination(): OffsetPaginationEvent {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }
});
