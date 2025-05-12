import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { AdaptiveRunApi, TrainingRunApi } from '@crczp/training-api';
import { throwError } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import {
    createAdaptiveRunApiSpy,
    createContext,
    createErrorHandlerSpy,
    createNavigatorSpy,
    createRouterSpy,
    createTrainingRunApiSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingNavigator } from '../../../../../src/services/training-navigator.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { AccessedTrainingRunConcreteService } from './accessed-training-run-concrete.service';
import { AccessedAdaptiveRunConcreteService } from '../adaptive/accessed-adaptive-run-concrete.service';

describe('AccessedTrainingRunConcreteService', () => {
    let service: AccessedTrainingRunConcreteService;
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let trainingApiSpy: jasmine.SpyObj<TrainingRunApi>;
    let adaptiveApiSpy: jasmine.SpyObj<AdaptiveRunApi>;
    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;
    let routerSpy: jasmine.SpyObj<Router>;
    let context: TrainingAgendaContext;

    beforeEach(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        trainingApiSpy = createTrainingRunApiSpy();
        adaptiveApiSpy = createAdaptiveRunApiSpy();
        navigatorSpy = createNavigatorSpy();
        routerSpy = createRouterSpy();
        context = createContext();

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                AccessedTrainingRunConcreteService,
                AccessedAdaptiveRunConcreteService,
                { provide: TrainingRunApi, useValue: trainingApiSpy },
                { provide: AdaptiveRunApi, useValue: adaptiveApiSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingAgendaContext, useValue: context },
                { provide: TrainingNavigator, useValue: navigatorSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });
        service = TestBed.inject(AccessedTrainingRunConcreteService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call error handler on err', () => {
        trainingApiSpy.getAccessed.and.returnValue(throwError(null));

        service.getAll(createPagination(), null).subscribe(
            () => [],
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
            },
        );
        expect(trainingApiSpy.getAccessed).toHaveBeenCalledTimes(1);
    });

    it('should emit hasError on err', (done) => {
        trainingApiSpy.getAccessed.and.returnValue(throwError(null));
        const pagination = createPagination();
        service.hasError$
            .pipe(skip(2)) // we ignore initial value and value emitted before the call is made
            .subscribe((emitted) => {
                expect(emitted).toBeTruthy();
                done();
            }, fail);
        service
            .getAll(pagination, null)
            .pipe(take(1))
            .subscribe(fail, (_) => _);
    });

    function createPagination() {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }
});
