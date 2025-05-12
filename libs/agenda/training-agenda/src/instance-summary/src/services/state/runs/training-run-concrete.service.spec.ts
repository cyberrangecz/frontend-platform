import { TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SandboxAllocationUnitsApi, SandboxInstanceApi } from '@crczp/sandbox-api';
import { TrainingInstanceApi, TrainingRunApi } from '@crczp/training-api';
import { throwError } from 'rxjs';
import { skip } from 'rxjs/operators';
import {
    createContext,
    createDialogSpy,
    createErrorHandlerSpy,
    createNotificationSpy,
    createSandboxInstanceApiSpy,
    createSauApi,
    createTrainingInstanceApiSpy,
    createTrainingRunApiSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingNotificationService } from '../../../../../src/services/training-notification.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { TrainingRunConcreteService } from './training-run-concrete.service';

describe('TrainingRunConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let notificationSpy: jasmine.SpyObj<TrainingNotificationService>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let trainingInstanceApiSpy: jasmine.SpyObj<TrainingInstanceApi>;
    let trainingRunApiSpy: jasmine.SpyObj<TrainingRunApi>;
    let sandboxInstanceApiSpy: jasmine.SpyObj<SandboxInstanceApi>;
    let sauApiSpy: jasmine.SpyObj<SandboxAllocationUnitsApi>;
    let service: TrainingRunConcreteService;
    let context: TrainingAgendaContext;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        sandboxInstanceApiSpy = createSandboxInstanceApiSpy();
        sauApiSpy = createSauApi();
        trainingInstanceApiSpy = createTrainingInstanceApiSpy();
        trainingRunApiSpy = createTrainingRunApiSpy();
        dialogSpy = createDialogSpy();
        context = createContext();
        TestBed.configureTestingModule({
            providers: [
                TrainingRunConcreteService,
                { provide: MatDialog, useValue: dialogSpy },
                { provide: TrainingInstanceApi, useValue: trainingInstanceApiSpy },
                { provide: TrainingRunApi, useValue: trainingRunApiSpy },
                { provide: SandboxAllocationUnitsApi, useValue: sauApiSpy },
                { provide: SandboxInstanceApi, useValue: sandboxInstanceApiSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingNotificationService, useValue: notificationSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
        });
        service = TestBed.inject(TrainingRunConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should emit hasError on err', (done) => {
        const pagination = createPagination();
        trainingInstanceApiSpy.getAssociatedTrainingRuns.and.returnValue(throwError(null));
        service.hasError$
            .pipe(
                skip(1), // we ignore initial value
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

    function createPagination() {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }

    function createMock() {
        return new PaginatedResource([], new OffsetPagination(1, 0, 5, 5, 1));
    }
});
