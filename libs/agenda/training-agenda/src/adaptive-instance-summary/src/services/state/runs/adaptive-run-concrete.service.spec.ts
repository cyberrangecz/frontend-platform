import { TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SandboxAllocationUnitsApi, SandboxInstanceApi } from '@crczp/sandbox-api';
import { AdaptiveInstanceApi, AdaptiveRunApi } from '@crczp/training-api';
import { throwError } from 'rxjs';
import { skip } from 'rxjs/operators';
import {
    createAdaptiveInstanceApiSpy,
    createAdaptiveRunApiSpy,
    createContext,
    createDialogSpy,
    createErrorHandlerSpy,
    createNotificationSpy,
    createSandboxInstanceApiSpy,
    createSauApi,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingNotificationService } from '../../../../../src/services/training-notification.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { AdaptiveRunConcreteService } from './adaptive-run-concrete.service';

describe('TrainingRunConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let notificationSpy: jasmine.SpyObj<TrainingNotificationService>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let adaptiveInstanceApiSpy: jasmine.SpyObj<AdaptiveInstanceApi>;
    let adaptiveRunApiSpy: jasmine.SpyObj<AdaptiveRunApi>;
    let sandboxInstanceApiSpy: jasmine.SpyObj<SandboxInstanceApi>;
    let sauApiSpy: jasmine.SpyObj<SandboxAllocationUnitsApi>;
    let service: AdaptiveRunConcreteService;
    let context: TrainingAgendaContext;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        sandboxInstanceApiSpy = createSandboxInstanceApiSpy();
        sauApiSpy = createSauApi();
        adaptiveInstanceApiSpy = createAdaptiveInstanceApiSpy();
        adaptiveRunApiSpy = createAdaptiveRunApiSpy();
        dialogSpy = createDialogSpy();
        context = createContext();
        TestBed.configureTestingModule({
            providers: [
                AdaptiveRunConcreteService,
                { provide: MatDialog, useValue: dialogSpy },
                { provide: AdaptiveInstanceApi, useValue: adaptiveInstanceApiSpy },
                { provide: AdaptiveRunApi, useValue: adaptiveRunApiSpy },
                { provide: SandboxAllocationUnitsApi, useValue: sauApiSpy },
                { provide: SandboxInstanceApi, useValue: sandboxInstanceApiSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingNotificationService, useValue: notificationSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
        });
        service = TestBed.inject(AdaptiveRunConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should emit hasError on err', (done) => {
        const pagination = createPagination();
        adaptiveInstanceApiSpy.getAssociatedTrainingRuns.and.returnValue(throwError(null));
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
