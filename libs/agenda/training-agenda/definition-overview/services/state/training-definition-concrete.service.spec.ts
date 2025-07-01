import {TestBed} from '@angular/core/testing';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {RouterTestingModule} from '@angular/router/testing';
import {SentinelDialogResultEnum} from '@sentinel/components/dialogs';
import {asyncData} from '@sentinel/common/testing';
import {SentinelFilter} from '@sentinel/common/filter';
import {OffsetPagination, OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {TrainingDefinitionApi} from 'libs/api/training-api/src';
import {TrainingDefinition, TrainingDefinitionStateEnum} from 'libs/model/training-model/src';
import {of, throwError} from 'rxjs';
import {
    createContext,
    createDialogSpy,
    createErrorHandlerSpy,
    createNavigatorSpy,
    createNotificationSpy,
    createTrainingDefinitionApiSpy,
} from '../../../../internal/testing/testing-commons.spec';
import {TrainingErrorHandler, TrainingNavigator, TrainingNotificationService} from '../../../../src';
import {TrainingAgendaContext} from '@crczp/training-agenda/internal';
import {FileUploadProgressService} from '../file-upload/file-upload-progress.service';
import {TrainingDefinitionConcreteService} from './training-definition.concrete.service';
import {fail} from "node:assert";

describe('TrainingDefinitionConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let notificationSpy: jasmine.SpyObj<TrainingNotificationService>;
    let apiSpy: jasmine.SpyObj<TrainingDefinitionApi>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let service: TrainingDefinitionConcreteService;
    let context: TrainingAgendaContext;
    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;

    beforeEach(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        apiSpy = createTrainingDefinitionApiSpy();
        dialogSpy = createDialogSpy();
        navigatorSpy = createNavigatorSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                TrainingDefinitionConcreteService,
                FileUploadProgressService,
                {provide: MatDialog, useValue: dialogSpy},
                {provide: TrainingNavigator, useValue: navigatorSpy},
                {provide: TrainingNotificationService, useValue: notificationSpy},
                {provide: TrainingDefinitionApi, useValue: apiSpy},
                {provide: TrainingErrorHandler, useValue: errorHandlerSpy},
                {provide: TrainingAgendaContext, useValue: context},
            ],
            imports: [
                MatDialogModule,
                RouterTestingModule.withRoutes([
                    {path: 'create', redirectTo: ''},
                    {path: 'edit', redirectTo: ''},
                    {path: 'preview', redirectTo: ''},
                ]),
            ],
        });
        service = TestBed.inject(TrainingDefinitionConcreteService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should get all training definitions', (done) => {
        apiSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        service.getAll(createPagination(), 'filter').subscribe(
            (res) => {
                expect(res).toBeTruthy();
                expect(res).toEqual(createPaginatedMock());
                done();
            },
            () => fail,
        );
        expect(apiSpy.getAll).toHaveBeenCalledTimes(1);
        expect(apiSpy.getAll).toHaveBeenCalledWith(createPagination(), [new SentinelFilter('title', 'filter')]);
    });

    it('should emit error when get all training definitions fails', (done) => {
        apiSpy.getAll.and.returnValue(throwError(null));
        service.getAll(createPagination(), 'filter').subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
        expect(apiSpy.getAll).toHaveBeenCalledTimes(1);
        expect(apiSpy.getAll).toHaveBeenCalledWith(createPagination(), [new SentinelFilter('title', 'filter')]);
    });

    it('should redirects to training definition creation page', (done) => {
        navigatorSpy.toNewTrainingDefinition.and.returnValue('create');
        service.create().subscribe(
            () => done(),
            () => fail,
        );
        expect(navigatorSpy.toNewTrainingDefinition).toHaveBeenCalledTimes(1);
    });

    it('should redirects to training definition edit page', (done) => {
        navigatorSpy.toTrainingDefinitionEdit.and.returnValue('edit');
        service.edit(new TrainingDefinition()).subscribe(
            () => done(),
            () => fail,
        );
        expect(navigatorSpy.toTrainingDefinitionEdit).toHaveBeenCalledTimes(1);
    });

    it('should redirects to training definition preview page', (done) => {
        navigatorSpy.toTrainingDefinitionPreview.and.returnValue('preview');
        service.preview(new TrainingDefinition()).subscribe(
            () => done(),
            () => fail,
        );
        expect(navigatorSpy.toTrainingDefinitionPreview).toHaveBeenCalledTimes(1);
    });

    it('should delete level', (done) => {
        apiSpy.delete.and.returnValue(asyncData(null));
        apiSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        const dialogRefSpyObj = jasmine.createSpyObj({
            afterClosed: of(SentinelDialogResultEnum.CONFIRMED),
            close: null,
        });
        dialogSpy.open.and.returnValue(dialogRefSpyObj);
        service.delete(createMock()[1]).subscribe(
            (res) => {
                expect(apiSpy.delete).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledWith('success', jasmine.anything());
                expect(res).toEqual(createPaginatedMock());
                done();
            },
            () => fail,
        );
    });

    it('should emit error when delete level fails', (done) => {
        apiSpy.delete.and.returnValue(throwError(null));
        apiSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        const dialogRefSpyObj = jasmine.createSpyObj({
            afterClosed: of(SentinelDialogResultEnum.CONFIRMED),
            close: null,
        });
        dialogSpy.open.and.returnValue(dialogRefSpyObj);
        service.delete(createMock()[1]).subscribe(
            () => fail,
            (err) => {
                expect(apiSpy.delete).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should clone training definition', (done) => {
        apiSpy.clone.and.returnValue(asyncData(1));
        apiSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        const trainingDefinition = createMock()[1];
        const dialogRefSpyObj = jasmine.createSpyObj({afterClosed: of(trainingDefinition), close: null});
        dialogSpy.open.and.returnValue(dialogRefSpyObj);
        service.clone(createMock()[1]).subscribe(
            (res) => {
                expect(apiSpy.clone).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledWith('success', jasmine.anything());
                expect(res).toEqual(createPaginatedMock());
                done();
            },
            () => fail,
        );
    });

    it('should emit error when clone training definition fails', (done) => {
        apiSpy.clone.and.returnValue(throwError(null));
        apiSpy.getAll.and.returnValue(asyncData(createPaginatedMock()));
        const trainingDefinition = createMock()[1];
        const dialogRefSpyObj = jasmine.createSpyObj({afterClosed: of(trainingDefinition), close: null});
        dialogSpy.open.and.returnValue(dialogRefSpyObj);
        service.clone(trainingDefinition).subscribe(
            () => fail,
            (err) => {
                expect(apiSpy.clone).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should emit error when download training definition fails', (done) => {
        apiSpy.download.and.returnValue(throwError(null));
        const trainingDefinition = createMock()[1];
        service.download(trainingDefinition).subscribe(
            () => fail,
            (err) => {
                expect(apiSpy.download).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should change state of training definition', (done) => {
        apiSpy.changeState.and.returnValue(asyncData(1));
        const trainingDefinition = createMock()[1];
        const dialogRefSpyObj = jasmine.createSpyObj({
            afterClosed: of(SentinelDialogResultEnum.CONFIRMED),
            close: null,
        });
        dialogSpy.open.and.returnValue(dialogRefSpyObj);
        service.changeState(trainingDefinition, TrainingDefinitionStateEnum.Archived).subscribe(
            (res) => {
                expect(apiSpy.changeState).toHaveBeenCalledTimes(1);
                expect(apiSpy.changeState).toHaveBeenCalledWith(1, TrainingDefinitionStateEnum.Archived);
                expect(res).toEqual(1);
                done();
            },
            () => fail,
        );
    });

    it('should emit error when change state of training definition fails', (done) => {
        apiSpy.changeState.and.returnValue(throwError(null));
        const trainingDefinition = createMock()[1];
        const dialogRefSpyObj = jasmine.createSpyObj({
            afterClosed: of(SentinelDialogResultEnum.CONFIRMED),
            close: null,
        });
        dialogSpy.open.and.returnValue(dialogRefSpyObj);
        service.changeState(trainingDefinition, TrainingDefinitionStateEnum.Archived).subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    function createMock(): TrainingDefinition[] {
        const def1 = new TrainingDefinition();
        def1.id = 0;
        def1.title = 'Def1';
        def1.state = TrainingDefinitionStateEnum.Released;
        const def2 = new TrainingDefinition();
        def2.id = 1;
        def2.title = 'Def2';
        def2.state = TrainingDefinitionStateEnum.Released;
        const def3 = new TrainingDefinition();
        def3.id = 2;
        def3.title = 'Def3';
        def3.state = TrainingDefinitionStateEnum.Released;

        return [def1, def2, def3];
    }

    function createPaginatedMock(): PaginatedResource<TrainingDefinition> {
        return new PaginatedResource<TrainingDefinition>(createMock(), new OffsetPagination(1, 3, 3, 3, 1));
    }

    function createPagination() {
        return new OffsetPaginationEvent(1, 3, '', 'asc');
    }
});
