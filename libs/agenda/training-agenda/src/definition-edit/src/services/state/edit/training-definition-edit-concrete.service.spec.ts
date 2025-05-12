import { TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { asyncData } from '@sentinel/common/testing';
import { TrainingDefinitionApi } from '@crczp/training-api';
import { TrainingDefinition, TrainingDefinitionStateEnum } from '@crczp/training-model';
import { throwError } from 'rxjs';
import { TrainingDefinitionChangeEvent } from '../../../model/events/training-definition-change-event';
import {
    createContext,
    createErrorHandlerSpy,
    createLevelEditServiceSpy,
    createNavigatorSpy,
    createNotificationSpy,
    createRouterSpy,
    createTrainingDefinitionApiSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingNavigator } from '../../../../../src/services/training-navigator.service';
import { TrainingNotificationService } from '../../../../../src/services/training-notification.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { TrainingDefinitionEditConcreteService } from './training-definition-edit-concrete.service';
import { LevelEditService } from '../level/level-edit.service';

describe('TrainingDefinitionEditConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let notificationSpy: jasmine.SpyObj<TrainingNotificationService>;
    let apiSpy: jasmine.SpyObj<TrainingDefinitionApi>;
    let levelEditServiceSpy: jasmine.SpyObj<LevelEditService>;
    let service: TrainingDefinitionEditConcreteService;
    let context: TrainingAgendaContext;
    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        apiSpy = createTrainingDefinitionApiSpy();
        levelEditServiceSpy = createLevelEditServiceSpy();
        navigatorSpy = createNavigatorSpy();
        routerSpy = createRouterSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                TrainingDefinitionEditConcreteService,
                { provide: Router, useValue: routerSpy },
                { provide: TrainingNavigator, useValue: navigatorSpy },
                { provide: TrainingNotificationService, useValue: notificationSpy },
                { provide: TrainingDefinitionApi, useValue: apiSpy },
                { provide: LevelEditService, useValue: levelEditServiceSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
        });
        service = TestBed.inject(TrainingDefinitionEditConcreteService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set training definition as currently edited', () => {
        service.set(createMock());
        service.trainingDefinition$.subscribe((td) => {
            expect(td).toEqual(createMock());
        });
        service.editMode$.subscribe((isEdit) => {
            expect(isEdit).toBeTruthy();
        });
    });

    it('should create new training definition if set is not called with one', () => {
        service.set(null);
        service.trainingDefinition$.subscribe((td) => {
            expect(td).toEqual(new TrainingDefinition());
        });
    });

    it('should save existing training definition', () => {
        apiSpy.update.and.returnValue(asyncData(0));
        levelEditServiceSpy.saveUnsavedLevels.and.returnValue(asyncData(0));
        service.set(createMock());
        service.change(createChangeEventMock());
        service.save().subscribe(
            (res) => {
                expect(apiSpy.update).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledWith('success', jasmine.anything());
                expect(res).toEqual(0);
            },
            () => fail,
        );
    });

    it('should save new training definition', (done) => {
        apiSpy.create.and.returnValue(asyncData(createMock()));
        routerSpy.navigate.and.returnValue(asyncData(true).toPromise());
        service.save().subscribe(
            () => {
                expect(apiSpy.create).toHaveBeenCalledTimes(1);
                expect(routerSpy.navigate).toHaveBeenCalledTimes(1);
                expect(navigatorSpy.toTrainingDefinitionEdit).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledWith('success', jasmine.anything());
                done();
            },
            () => fail,
        );
    });

    it('should emit error when save existing training definition fails', (done) => {
        apiSpy.update.and.returnValue(throwError(null));
        service.set(createMock());
        service.change(createChangeEventMock());
        service.save().subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should emit error when save new training definition fails', (done) => {
        apiSpy.create.and.returnValue(throwError(null));
        routerSpy.navigate.and.returnValue(asyncData(true).toPromise());
        service.save().subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should create training definition and stay on edit page', (done) => {
        apiSpy.create.and.returnValue(asyncData(createMock()));
        routerSpy.navigate.and.returnValue(asyncData(true).toPromise());
        service.save().subscribe(
            () => {
                expect(apiSpy.create).toHaveBeenCalledTimes(1);
                expect(routerSpy.navigate).toHaveBeenCalledTimes(1);
                expect(navigatorSpy.toTrainingDefinitionEdit).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledWith('success', jasmine.anything());
                done();
            },
            () => fail,
        );
    });

    it('should emit error when create training definition and stay on edit page fails', (done) => {
        apiSpy.create.and.returnValue(throwError(null));
        routerSpy.navigate.and.returnValue(asyncData(true).toPromise());
        service.save().subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should update and save snapshot of edited training definition', () => {
        service.change(new TrainingDefinitionChangeEvent(createMock(), false));
        service.saveDisabled$.subscribe((idDisabled) => expect(idDisabled).toBeTruthy());
    });

    function createMock(): TrainingDefinition {
        const def1 = new TrainingDefinition();
        def1.id = 0;
        def1.title = 'Def1';
        def1.state = TrainingDefinitionStateEnum.Released;

        return def1;
    }

    function createChangeEventMock(): TrainingDefinitionChangeEvent {
        return new TrainingDefinitionChangeEvent(createMock(), true);
    }
});
