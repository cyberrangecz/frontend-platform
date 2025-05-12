import { TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { asyncData } from '@sentinel/common/testing';
import { TrainingInstance } from '@crczp/training-model';
import {
    createContext,
    createNavigatorSpy,
    createRouterSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingNavigator } from '../../../../../src/services/training-navigator.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { TrainingInstanceSummaryConcreteService } from './training-instance-summary-concrete.service';

describe('TrainingInstanceSummaryConcreteService', () => {
    let routerSpy: jasmine.SpyObj<Router>;
    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;
    let service: TrainingInstanceSummaryConcreteService;
    let context: TrainingAgendaContext;

    beforeEach(waitForAsync(() => {
        routerSpy = createRouterSpy();
        navigatorSpy = createNavigatorSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                TrainingInstanceSummaryConcreteService,
                { provide: TrainingNavigator, useValue: navigatorSpy },
                { provide: Router, useValue: routerSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
        });
        service = TestBed.inject(TrainingInstanceSummaryConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should init service', (done) => {
        const trainingInstance = createMock();
        spyOn(trainingInstance, 'hasStarted').and.returnValue(true);
        service.init(trainingInstance);
        service.hasStarted$.subscribe((res) => {
            expect(res).toBeTruthy();
            done();
        });
    });

    it('should show progress', (done) => {
        const trainingInstance = createMock();
        routerSpy.navigate.and.returnValue(asyncData(true).toPromise());
        navigatorSpy.toTrainingInstanceProgress.and.returnValue('navigate');
        service.init(trainingInstance);
        service.showProgress().subscribe((res) => {
            expect(res).toBeTruthy();
            expect(routerSpy.navigate).toHaveBeenCalledTimes(1);
            expect(navigatorSpy.toTrainingInstanceProgress).toHaveBeenCalledTimes(1);
            done();
        });
    });

    it('should show results', (done) => {
        const trainingInstance = createMock();
        routerSpy.navigate.and.returnValue(asyncData(true).toPromise());
        navigatorSpy.toTrainingInstanceResults.and.returnValue('navigate');
        service.init(trainingInstance);
        service.showResults().subscribe((res) => {
            expect(res).toBeTruthy();
            expect(routerSpy.navigate).toHaveBeenCalledTimes(1);
            expect(navigatorSpy.toTrainingInstanceResults).toHaveBeenCalledTimes(1);
            done();
        });
    });

    function createMock(): TrainingInstance {
        const trainingInstance = new TrainingInstance();
        trainingInstance.id = 2;
        trainingInstance.startTime = new Date();
        return trainingInstance;
    }
});
