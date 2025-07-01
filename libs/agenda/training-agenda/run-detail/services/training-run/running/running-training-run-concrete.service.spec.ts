import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {asyncData} from '@sentinel/common/testing';
import {TrainingRunApi} from 'libs/api/training-api/src';
import {AccessTrainingRunInfo, Level} from 'libs/model/training-model/src';
import {throwError} from 'rxjs';
import {
    createContext,
    createDialogSpy,
    createErrorHandlerSpy,
    createNavigatorSpy,
    createRouterSpy,
    createTopologyApiSpy,
    createTrainingRunApiSpy,
} from '../../../../../internal/testing/testing-commons.spec';
import {TrainingErrorHandler} from '../../../../../src/services/training-error.handler.service';
import {TrainingNavigator} from '../../../../../src/services/training-navigator.service';
import {TrainingAgendaContext} from '../../../../../internal/services/context/training-agenda-context.service';
import {RunningTrainingRunConcreteService} from './running-training-run-concrete.service';
import {MatDialog} from '@angular/material/dialog';
import {TopologyApi} from 'libs/components/topology-graph/src';
import {fail} from "node:assert";

describe('RunningTrainingRunConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let apiSpy: jasmine.SpyObj<TrainingRunApi>;
    let topologySpi: jasmine.SpyObj<TopologyApi>;
    let service: RunningTrainingRunConcreteService;
    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;
    let routerSpy: jasmine.SpyObj<Router>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let context: TrainingAgendaContext;

    beforeEach(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        apiSpy = createTrainingRunApiSpy();
        topologySpi = createTopologyApiSpy();
        navigatorSpy = createNavigatorSpy();
        routerSpy = createRouterSpy();
        dialogSpy = createDialogSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                RunningTrainingRunConcreteService,
                {provide: TrainingRunApi, useValue: apiSpy},
                {provide: TopologyApi, useValue: topologySpi},
                {provide: Router, useValue: routerSpy},
                {provide: MatDialog, useValue: dialogSpy},
                {provide: TrainingErrorHandler, useValue: errorHandlerSpy},
                {provide: TrainingNavigator, useValue: navigatorSpy},
                {provide: TrainingAgendaContext, useValue: context},
            ],
            imports: [RouterTestingModule],
        });
        service = TestBed.inject(RunningTrainingRunConcreteService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialze service', () => {
        const accessInfo = createAccessTrainingRunInfoMock();
        service.init(accessInfo);
        expect(service.getLevels()).toEqual(createLevelsMock());
        expect(service.getStartTime()).toEqual(accessInfo.startTime);
        expect(service.getActiveLevel()).toEqual(accessInfo.currentLevel as Level);
        expect(service.getActiveLevelPosition()).toEqual(1);
        expect(service.getIsStepperDisplayed()).toBeTrue();
    });

    it('should move to next level', (done) => {
        const accessInfo = createAccessTrainingRunInfoMock();
        const nextLevel = createLevelsMock()[2];
        apiSpy.nextLevel.and.returnValue(asyncData(nextLevel));
        service.init(accessInfo);
        service.next().subscribe(
            (res) => {
                expect(res).toBeTruthy();
                expect(res).toEqual(nextLevel);
                expect(apiSpy.nextLevel).toHaveBeenCalledTimes(1);
                expect(service.getActiveLevel()).toEqual(nextLevel);
                done();
            },
            () => fail,
        );
    });

    it('should emit error when move to next level fails', (done) => {
        const accessInfo = createAccessTrainingRunInfoMock();
        apiSpy.nextLevel.and.returnValue(throwError(null));
        service.init(accessInfo);
        service.next().subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should throw error when finish when next is called on last level and fails', (done) => {
        const accessInfo = createAccessTrainingRunInfoMock();
        apiSpy.finish.and.returnValue(throwError(null));
        accessInfo.currentLevel = createLevelsMock()[2];
        service.init(accessInfo);
        service.next().subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should clear current TR attributes', () => {
        const accessInfo = createAccessTrainingRunInfoMock();
        service.init(accessInfo);
        service.clear();
        expect(service.trainingRunId).toBeFalsy();
        expect(service.sandboxInstanceId).toBeFalsy();
        expect(service.getStartTime()).toBeFalsy();
        expect(service.getLevels().length).toEqual(0);
        service.activeLevel$.subscribe((res) => expect(res).toBeFalsy());
    });

    function createAccessTrainingRunInfoMock() {
        const accessInfo = new AccessTrainingRunInfo();
        accessInfo.trainingRunId = 2;
        accessInfo.sandboxInstanceId = 'iuidusfghiudsfhg65fd5g498f5h9f8gh5fg';
        accessInfo.levels = createLevelsMock();
        accessInfo.startTime = new Date();
        accessInfo.currentLevel = createLevelsMock()[1];
        accessInfo.isStepperDisplayed = true;
        return accessInfo;
    }

    function createLevelsMock() {
        const level1 = new DummyLevel();
        level1.id = 0;
        const level2 = new DummyLevel();
        level2.id = 1;
        const level3 = new DummyLevel();
        level3.id = 2;
        return [level1, level2, level3];
    }

    class DummyLevel extends Level {
        constructor() {
            super();
        }
    }
});
