import { TestBed, waitForAsync } from '@angular/core/testing';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { AdaptiveDefinitionApiService } from '@crczp/training-api';
import { TrainingDefinitionInfo } from '@crczp/training-model';
import { throwError } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import {
    createAdaptiveDefinitionApiSpy,
    createContext,
    createErrorHandlerSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { AdaptiveDefinitionOrganizerSelectConcreteService } from './adaptive-definition-organizer-select-concrete.service';

describe('TrainingDefinitionOrganizerSelectorService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let adApiSpy: jasmine.SpyObj<AdaptiveDefinitionApiService>;
    let service: AdaptiveDefinitionOrganizerSelectConcreteService;
    let context: TrainingAgendaContext;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        adApiSpy = createAdaptiveDefinitionApiSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                AdaptiveDefinitionOrganizerSelectConcreteService,
                { provide: AdaptiveDefinitionApiService, useValue: adApiSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
        });
        service = TestBed.inject(AdaptiveDefinitionOrganizerSelectConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load training definitions from facade (called once)', (done) => {
        adApiSpy.getAllForOrganizer.and.returnValue(asyncData(createMock()));
        const pagination = createPagination();
        service.getAll(pagination, 'RELEASED').subscribe(() => done(), fail);
        expect(adApiSpy.getAllForOrganizer).toHaveBeenCalledTimes(1);
    });

    it('should call error handler on err', (done) => {
        adApiSpy.getAllForOrganizer.and.returnValue(throwError(null));
        const pagination = createPagination();
        service.getAll(pagination, 'RELEASED').subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    it('should emit hasError on err', (done) => {
        adApiSpy.getAllForOrganizer.and.returnValue(throwError(null));
        const pagination = createPagination();
        service.hasError$
            .pipe(skip(2)) // we ignore initial value and value emitted before the call is made
            .subscribe((emitted) => {
                expect(emitted).toBeTruthy();
                done();
            }, fail);
        service
            .getAll(pagination, 'RELEASED')
            .pipe(take(1))
            .subscribe(fail, (_) => _);
    });

    it('should emit next value on get', (done) => {
        const mockData = createMock();
        adApiSpy.getAllForOrganizer.and.returnValue(asyncData(mockData));
        const pagination = createPagination();
        service.resource$.pipe(skip(1)).subscribe((emitted) => {
            expect(emitted).toBe(mockData);
            done();
        }, fail);

        service
            .getAll(pagination, 'RELEASED')
            .pipe(take(1))
            .subscribe((_) => _, fail);
    });

    function createPagination() {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }

    function createMock() {
        const td1 = new TrainingDefinitionInfo();
        td1.id = 0;
        const td2 = new TrainingDefinitionInfo();
        td2.id = 1;
        return new PaginatedResource([td1, td2], new OffsetPagination(1, 2, 5, 2, 1));
    }
});
