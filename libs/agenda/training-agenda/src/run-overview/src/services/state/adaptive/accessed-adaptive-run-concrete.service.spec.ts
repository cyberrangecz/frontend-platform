import { TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { AdaptiveRunApi } from '@crczp/training-api';
import { throwError } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import {
    createAdaptiveRunApiSpy,
    createContext,
    createErrorHandlerSpy,
    createNavigatorSpy,
    createRouterSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingNavigator } from '../../../../../src/services/training-navigator.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { AccessedAdaptiveRunConcreteService } from './accessed-adaptive-run-concrete.service';

describe('AccessedTrainingRunConcreteService', () => {
    let service: AccessedAdaptiveRunConcreteService;
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let apiSpy: jasmine.SpyObj<AdaptiveRunApi>;
    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;
    let routerSpy: jasmine.SpyObj<Router>;
    let context: TrainingAgendaContext;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        apiSpy = createAdaptiveRunApiSpy();
        navigatorSpy = createNavigatorSpy();
        routerSpy = createRouterSpy();
        context = createContext();

        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                AccessedAdaptiveRunConcreteService,
                { provide: AdaptiveRunApi, useValue: apiSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingAgendaContext, useValue: context },
                { provide: TrainingNavigator, useValue: navigatorSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });
        service = TestBed.inject(AccessedAdaptiveRunConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should call error handler on err', (done) => {
        apiSpy.getAccessed.and.returnValue(throwError(null));

        service.getAll(createPagination()).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
        expect(apiSpy.getAccessed).toHaveBeenCalledTimes(1);
    });

    it('should emit hasError on err', (done) => {
        apiSpy.getAccessed.and.returnValue(throwError(null));
        const pagination = createPagination();
        service.hasError$
            .pipe(skip(2)) // we ignore initial value and value emitted before the call is made
            .subscribe((emitted) => {
                expect(emitted).toBeTruthy();
                done();
            }, fail);
        service
            .getAll(pagination)
            .pipe(take(1))
            .subscribe(fail, (_) => _);
    });

    function createPagination() {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }
});
