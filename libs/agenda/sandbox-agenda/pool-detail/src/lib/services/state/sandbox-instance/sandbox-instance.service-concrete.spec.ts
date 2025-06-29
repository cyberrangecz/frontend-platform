import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { throwError } from 'rxjs';
import { skip } from 'rxjs/operators';
import { SandboxErrorHandler, SandboxNavigator, SandboxNotificationService } from '@crczp/sandbox-agenda';
import { PoolApi, SandboxAllocationUnitsApi, SandboxInstanceApi } from 'libs/api/sandbox-api/src';
import { SandboxInstanceConcreteService } from './sandbox-instance-concrete.service';
import {
    createContextSpy,
    createErrorHandlerSpy,
    createMatDialogSpy,
    createNavigatorSpy,
    createNotificationSpy,
    createPoolApiSpy,
    createSandboxAllocationUnitsServiceSpy,
    createSauApiSpy,
    createSiApiSpy,
} from '../../../../../../internal/src/lib/testing/testing-commons.spec';
import { SandboxAgendaContext } from '../../../../../../internal/src/lib/services/sandox-agenda-context.service';
import { SandboxAllocationUnitsService } from '../sandbox-allocation-unit/sandbox-allocation-units.service';

describe('SandboxInstanceConcreteService', () => {
    let sandboxInstanceApiSpy: jasmine.SpyObj<SandboxInstanceApi>;
    let sandboxAllocationUnitsServiceSpy: jasmine.SpyObj<SandboxAllocationUnitsService>;
    let poolApiSpy: jasmine.SpyObj<PoolApi>;
    let sauApiSpy: jasmine.SpyObj<SandboxAllocationUnitsApi>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let navigatorSpy: jasmine.SpyObj<SandboxNavigator>;
    let contextSpy: jasmine.SpyObj<SandboxAgendaContext>;
    let notificationSpy: jasmine.SpyObj<SandboxNotificationService>;
    let errorHandlerSpy: jasmine.SpyObj<SandboxErrorHandler>;
    let service: SandboxInstanceConcreteService;

    beforeEach(waitForAsync(() => {
        poolApiSpy = createPoolApiSpy();
        sandboxAllocationUnitsServiceSpy = createSandboxAllocationUnitsServiceSpy();
        sandboxInstanceApiSpy = createSiApiSpy();
        sauApiSpy = createSauApiSpy();
        dialogSpy = createMatDialogSpy();
        navigatorSpy = createNavigatorSpy();
        contextSpy = createContextSpy();
        notificationSpy = createNotificationSpy();
        errorHandlerSpy = createErrorHandlerSpy();

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                SandboxInstanceConcreteService,
                { provide: SandboxInstanceApi, useValue: sandboxInstanceApiSpy },
                { provide: SandboxAllocationUnitsService, useValue: sandboxAllocationUnitsServiceSpy },
                { provide: PoolApi, useValue: poolApiSpy },
                { provide: SandboxAllocationUnitsApi, useValue: sauApiSpy },
                { provide: MatDialog, useValue: dialogSpy },
                { provide: SandboxNavigator, useValue: navigatorSpy },
                { provide: SandboxAgendaContext, useValue: contextSpy },
                { provide: SandboxNotificationService, useValue: notificationSpy },
                { provide: SandboxErrorHandler, useValue: errorHandlerSpy },
            ],
        });
        service = TestBed.inject(SandboxInstanceConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load data from api', (done) => {
        const pagination = createPagination();
        sandboxInstanceApiSpy.getSandboxes.and.returnValue(asyncData(null));

        service.getAllSandboxes(0, pagination).subscribe(() => done(), fail);
        expect(sandboxInstanceApiSpy.getSandboxes).toHaveBeenCalledTimes(1);
    });

    it('should emit next value on update', (done) => {
        const pagination = createPagination();
        const mockData = createMock();
        sandboxInstanceApiSpy.getSandboxes.and.returnValue(asyncData(mockData));

        service.resource$.pipe(skip(1)).subscribe((emitted) => {
            expect(emitted).toEqual(mockData);
            done();
        }, fail);
        service.getAllSandboxes(0, pagination).subscribe((_) => _, fail);
    });

    it('should call error handler on err', (done) => {
        const pagination = createPagination();
        sandboxInstanceApiSpy.getSandboxes.and.returnValue(throwError(null));

        service.getAllSandboxes(0, pagination).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    it('should emit hasError observable on err', (done) => {
        const pagination = createPagination();
        sandboxInstanceApiSpy.getSandboxes.and.returnValue(throwError(null));
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
        service.getAllSandboxes(0, pagination).subscribe(
            () => fail,
            (_) => _,
        );
    });

    function createPagination() {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }

    function createMock() {
        return new PaginatedResource([], new OffsetPagination(1, 0, 5, 5, 1));
    }
});
