import { TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SandboxDefinitionApi } from '@crczp/sandbox-api';
import { SandboxDefinition } from '@crczp/sandbox-model';
import { throwError } from 'rxjs';
import { skip } from 'rxjs/operators';
import {
    createContextSpy,
    createDefinitionApiSpy,
    createErrorHandlerSpy,
    createMatDialogSpy,
    createNavigatorSpy,
    createNotificationSpy,
    createRouterSpy,
} from '../../testing/testing-commons.spec';
import { SandboxErrorHandler, SandboxNavigator, SandboxNotificationService } from '@crczp/sandbox-agenda';
import { SandboxAgendaContext } from '../sandox-agenda-context.service';
import { SandboxDefinitionOverviewConcreteService } from './sandbox-definition-overview-concrete.service';

describe('SandboxDefinitionOverviewConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let apiSpy: jasmine.SpyObj<SandboxDefinitionApi>;
    let notificationSpy: jasmine.SpyObj<SandboxNotificationService>;
    let navigatorSpy: jasmine.SpyObj<SandboxNavigator>;
    let contextSpy: jasmine.SpyObj<SandboxAgendaContext>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let routerSpy: jasmine.SpyObj<Router>;
    let service: SandboxDefinitionOverviewConcreteService;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        navigatorSpy = createNavigatorSpy();
        contextSpy = createContextSpy();
        dialogSpy = createMatDialogSpy();
        apiSpy = createDefinitionApiSpy();
        routerSpy = createRouterSpy();

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                SandboxDefinitionOverviewConcreteService,
                { provide: MatDialog, useValue: dialogSpy },
                { provide: Router, useValue: routerSpy },
                { provide: SandboxDefinitionApi, useValue: apiSpy },
                { provide: SandboxNotificationService, useValue: notificationSpy },
                { provide: SandboxNavigator, useValue: navigatorSpy },
                { provide: SandboxAgendaContext, useValue: contextSpy },
                { provide: SandboxErrorHandler, useValue: errorHandlerSpy },
            ],
        });
        service = TestBed.inject(SandboxDefinitionOverviewConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call error handler on err', waitForAsync(() => {
        const pagination = createPagination();
        apiSpy.getAll.and.returnValue(throwError(null));

        service.getAll(pagination).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
            },
        );
        expect(apiSpy.getAll).toHaveBeenCalledTimes(1);
    }));

    it('should emit next value on update (sandboxDefinitions)', waitForAsync(() => {
        const pagination = createPagination();
        const mockData = createMockData();
        apiSpy.getAll.and.returnValue(asyncData(mockData));

        service.resource$.pipe(skip(1)).subscribe((emitted) => {
            expect(emitted).toBe(mockData);
        }, fail);
        service.getAll(pagination).subscribe();
    }));

    function createPagination(): OffsetPaginationEvent {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }

    function createMockData() {
        const sandbox1 = new SandboxDefinition();
        sandbox1.id = 1;
        const sandbox2 = new SandboxDefinition();
        sandbox2.id = 2;
        return new PaginatedResource<SandboxDefinition>([sandbox1, sandbox2], new OffsetPagination(1, 2, 5, 2, 1));
    }
});
