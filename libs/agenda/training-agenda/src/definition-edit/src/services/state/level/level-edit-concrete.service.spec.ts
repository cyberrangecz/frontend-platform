import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SentinelDialogResultEnum } from '@sentinel/components/dialogs';
import { asyncData } from '@sentinel/common/testing';
import { TrainingDefinitionApi } from '@crczp/training-api';
import { AbstractLevelTypeEnum, AssessmentLevel, InfoLevel, TrainingLevel } from '@crczp/training-model';
import { of, throwError } from 'rxjs';

import {
    createContext,
    createDialogSpy,
    createErrorHandlerSpy,
    createNotificationSpy,
    createTrainingDefinitionApiSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingNotificationService } from '../../../../../src/services/training-notification.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { LevelEditConcreteService } from './level-edit-concrete.service';

describe('LevelEditConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let notificationSpy: jasmine.SpyObj<TrainingNotificationService>;
    let apiSpy: jasmine.SpyObj<TrainingDefinitionApi>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let service: LevelEditConcreteService;
    let context: TrainingAgendaContext;

    beforeEach(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        dialogSpy = createDialogSpy();
        apiSpy = createTrainingDefinitionApiSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                LevelEditConcreteService,
                { provide: MatDialog, useValue: dialogSpy },
                { provide: TrainingNotificationService, useValue: notificationSpy },
                { provide: TrainingDefinitionApi, useValue: apiSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
            imports: [MatDialogModule, BrowserAnimationsModule],
        });
        service = TestBed.inject(LevelEditConcreteService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return correct levels count', () => {
        service.set(0, createMock());
        expect(service.getLevelsCount()).toEqual(2);
    });

    it('should set active level', (done) => {
        service.set(0, createMock());
        service.setActiveLevel(1);
        service.activeStep$.subscribe((activeStep) => {
            expect(activeStep).toEqual(1);
            done();
        });
    });

    it('should emit active level change', () => {
        service.onActiveLevelChanged(createMock()[0]);
        service.levels$.subscribe((levels) => {
            expect(levels).toBeTruthy();
            expect(levels[0].isUnsaved).toBeTruthy();
        });
        service.unsavedLevels$.subscribe((levels) => {
            expect(levels).toBeTruthy();
            expect(levels.length).toEqual(1);
            expect(levels[0].id).toEqual(createMock()[0].id);
        });
    });

    it('should return current sellected level', () => {
        service.set(1, createMock());
        service.setActiveLevel(1);
        expect(service.getSelected()).toEqual(createMock()[1]);
    });

    it('should navigate to last level', () => {
        service.set(1, createMock());
        service.navigateToLastLevel();
        expect(service.getSelected()).toEqual(createMock()[1]);
    });

    it('should navigate to previous level', () => {
        service.set(1, createMock());
        service.setActiveLevel(1);
        service.navigateToPreviousLevel();
        expect(service.getSelected()).toEqual(createMock()[0]);
    });

    it('should add new assessment level', (done) => {
        const assessmentLevel = new AssessmentLevel();
        apiSpy.createAssessmentLevel.and.returnValue(asyncData(assessmentLevel));
        apiSpy.getLevel.and.returnValue(asyncData(assessmentLevel));
        service.add(AbstractLevelTypeEnum.Assessment).subscribe(
            (res) => {
                expect(apiSpy.createAssessmentLevel).toHaveBeenCalledTimes(1);
                expect(res).toEqual(assessmentLevel);
                done();
            },
            () => fail,
        );
    });

    it('should add new training level', (done) => {
        const trainingLevel = new TrainingLevel();
        apiSpy.createTrainingLevel.and.returnValue(asyncData(trainingLevel));
        apiSpy.getLevel.and.returnValue(asyncData(trainingLevel));
        service.add(AbstractLevelTypeEnum.Training).subscribe(
            (res) => {
                expect(apiSpy.createTrainingLevel).toHaveBeenCalledTimes(1);
                expect(res).toEqual(trainingLevel);
                done();
            },
            () => fail,
        );
    });

    it('should add new info level', (done) => {
        const infoLevel = new InfoLevel();
        apiSpy.createInfoLevel.and.returnValue(asyncData(infoLevel));
        apiSpy.getLevel.and.returnValue(asyncData(infoLevel));
        service.add(AbstractLevelTypeEnum.Info).subscribe(
            (res) => {
                expect(apiSpy.createInfoLevel).toHaveBeenCalledTimes(1);
                expect(res).toEqual(infoLevel);
                done();
            },
            () => fail,
        );
    });

    it('should emit error when add new assessment level fails', (done) => {
        const assessmentLevel = new AssessmentLevel();
        apiSpy.createAssessmentLevel.and.returnValue(throwError(null));
        apiSpy.getLevel.and.returnValue(asyncData(assessmentLevel));
        service.add(AbstractLevelTypeEnum.Assessment).subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should emit error when should add new training level fails', (done) => {
        const trainingLevel = new TrainingLevel();
        apiSpy.createTrainingLevel.and.returnValue(throwError(null));
        apiSpy.getLevel.and.returnValue(asyncData(trainingLevel));
        service.add(AbstractLevelTypeEnum.Training).subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should emit error when should add new info level fails', (done) => {
        apiSpy.createInfoLevel.and.returnValue(throwError(null));
        apiSpy.getLevel.and.returnValue(asyncData(new InfoLevel()));
        service.add(AbstractLevelTypeEnum.Info).subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should save changes in levels', (done) => {
        apiSpy.updateTrainingDefinitionLevels.and.returnValue(asyncData(0));
        service.set(1, createMock());
        service.setActiveLevel(1);
        service.onActiveLevelChanged(createMock()[0]);
        service.saveUnsavedLevels().subscribe(
            () => {
                expect(notificationSpy.emit).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledWith('success', jasmine.anything());
                done();
            },
            () => fail,
        );
    });

    it('should emit error when level cannot be saved', (done) => {
        apiSpy.updateTrainingDefinitionLevels.and.returnValue(throwError(null));
        service.set(1, createMock());
        service.setActiveLevel(1);
        service.onActiveLevelChanged(createMock()[0]);
        service.saveUnsavedLevels().subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should delete selected level', (done) => {
        apiSpy.deleteLevel.and.returnValue(asyncData(createMock()));
        const dialogRefSpyObj = jasmine.createSpyObj({
            afterClosed: of(SentinelDialogResultEnum.CONFIRMED),
            close: null,
        });
        dialogSpy.open.and.returnValue(dialogRefSpyObj);
        service.set(1, createMock());
        service.setActiveLevel(1);
        service.deleteSelected().subscribe(
            () => {
                expect(apiSpy.deleteLevel).toHaveBeenCalledTimes(1);
                done();
            },
            () => fail,
        );
    });

    it('should emit error when deleting selected level fails', (done) => {
        apiSpy.deleteLevel.and.returnValue(throwError(null));
        const dialogRefSpyObj = jasmine.createSpyObj({
            afterClosed: of(SentinelDialogResultEnum.CONFIRMED),
            close: null,
        });
        dialogSpy.open.and.returnValue(dialogRefSpyObj);
        service.set(1, createMock());
        service.setActiveLevel(1);
        service.deleteSelected().subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    function createMock() {
        const trainingLevel1 = new TrainingLevel();
        trainingLevel1.id = 0;
        trainingLevel1.title = '1';
        const trainingLevel2 = new TrainingLevel();
        trainingLevel2.id = 1;
        trainingLevel2.title = '2';
        return [trainingLevel1, trainingLevel2];
    }
});
