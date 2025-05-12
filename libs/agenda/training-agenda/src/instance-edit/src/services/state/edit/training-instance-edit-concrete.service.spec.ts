import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { OffsetPagination, PaginatedResource } from '@sentinel/common/pagination';
import { asyncData } from '@sentinel/common/testing';
import { PoolApi, SandboxDefinitionApi, SandboxInstanceApi } from '@crczp/sandbox-api';
import { TrainingDefinitionApi, TrainingInstanceApi } from '@crczp/training-api';
import { TrainingDefinition, TrainingInstance } from '@crczp/training-model';
import { throwError } from 'rxjs';
import { TrainingInstanceChangeEvent } from '../../../model/events/training-instance-change-event';
import {
    createContext,
    createErrorHandlerSpy,
    createNavigatorSpy,
    createNotificationSpy,
    createPoolApiSpy,
    createRouterSpy,
    createSandboxDefinitionApiSpy,
    createSandboxInstanceApiSpy,
    createTrainingDefinitionApiSpy,
    createTrainingInstanceApiSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingNavigator } from '../../../../../src/services/training-navigator.service';
import { TrainingNotificationService } from '../../../../../src/services/training-notification.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { TrainingInstanceEditConcreteService } from './training-instance-edit-concrete.service';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';

describe('TrainingInstanceEditConcreteService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let trainingInstanceApiSpy: jasmine.SpyObj<TrainingInstanceApi>;
    let trainingDefinitionApiSpy: jasmine.SpyObj<TrainingDefinitionApi>;
    let poolApiSpy: jasmine.SpyObj<PoolApi>;
    let sandboxDefinitionApiSpy: jasmine.SpyObj<SandboxDefinitionApi>;
    let sandboxInstanceApiSpy: jasmine.SpyObj<SandboxInstanceApi>;
    let service: TrainingInstanceEditConcreteService;
    let navigatorSpy: jasmine.SpyObj<TrainingNavigator>;
    let routerSpy: jasmine.SpyObj<Router>;
    let notificationSpy: jasmine.SpyObj<TrainingNotificationService>;
    let context: TrainingAgendaContext;

    beforeEach(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        notificationSpy = createNotificationSpy();
        trainingInstanceApiSpy = createTrainingInstanceApiSpy();
        trainingDefinitionApiSpy = createTrainingDefinitionApiSpy();
        poolApiSpy = createPoolApiSpy();
        sandboxInstanceApiSpy = createSandboxInstanceApiSpy();
        sandboxDefinitionApiSpy = createSandboxDefinitionApiSpy();
        navigatorSpy = createNavigatorSpy();
        routerSpy = createRouterSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                TrainingInstanceEditConcreteService,
                { provide: TrainingInstanceApi, useValue: trainingInstanceApiSpy },
                { provide: SandboxInstanceApi, useValue: sandboxInstanceApiSpy },
                { provide: PoolApi, useValue: poolApiSpy },
                { provide: TrainingDefinitionApi, useValue: trainingDefinitionApiSpy },
                { provide: SandboxDefinitionApi, useValue: sandboxDefinitionApiSpy },
                { provide: Router, useValue: routerSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingNotificationService, useValue: notificationSpy },
                { provide: TrainingNavigator, useValue: navigatorSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
            imports: [RouterTestingModule],
        });
        service = TestBed.inject(TrainingInstanceEditConcreteService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set training instance as currently edited', () => {
        const trainingInstance = createMock();
        service.set(trainingInstance);
        service.trainingInstance$.subscribe((ti) => {
            expect(ti).toEqual(trainingInstance);
        });
        service.editMode$.subscribe((isEdit) => {
            expect(isEdit).toBeTruthy();
        });
    });

    it('should create new training instance if set is not called with one', () => {
        service.set(null);
        service.trainingInstance$.subscribe((ti) => {
            expect(ti).toBeTruthy();
        });
    });

    it('should save existing training instance', (done) => {
        trainingInstanceApiSpy.update.and.returnValue(asyncData(''));
        sandboxDefinitionApiSpy.getAll.and.returnValue(asyncData(createSandboxDefinitionsPaginatedMock()));
        trainingDefinitionApiSpy.getAllForOrganizer.and.returnValue(
            asyncData(createTrainingDefinitionsPaginatedMock()),
        );
        poolApiSpy.getPools.and.returnValue(asyncData(createPoolsPaginatedMock()));
        service.set(createMock());
        service.change(new TrainingInstanceChangeEvent(createMock(), true));
        service.save().subscribe(
            (res) => {
                expect(trainingInstanceApiSpy.update).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledWith('success', jasmine.anything());
                expect(res).toEqual(createSandboxDefinitionsPaginatedMock());
                done();
            },
            () => fail,
        );
    });

    it('should save new training instance', (done) => {
        trainingInstanceApiSpy.create.and.returnValue(asyncData(createMock()));
        routerSpy.navigate.and.returnValue(asyncData(true).toPromise());
        service.change(new TrainingInstanceChangeEvent(createMock(), true));
        service.save().subscribe(
            (res) => {
                expect(trainingInstanceApiSpy.create).toHaveBeenCalledTimes(1);
                expect(routerSpy.navigate).toHaveBeenCalledTimes(1);
                expect(navigatorSpy.toTrainingInstanceEdit).toHaveBeenCalledTimes(1);
                expect(notificationSpy.emit).toHaveBeenCalledWith('success', jasmine.anything());
                expect(res).toEqual(true);
                done();
            },
            () => fail,
        );
    });

    it('should emit error when save existing training instance fails', (done) => {
        trainingInstanceApiSpy.update.and.returnValue(throwError(null));
        service.set(createMock());
        service.save().subscribe(
            () => fail,
            (err) => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                expect(errorHandlerSpy.emit).toHaveBeenCalledWith(err, jasmine.anything());
                done();
            },
        );
    });

    it('should emit error when save new training instance fails', (done) => {
        trainingInstanceApiSpy.create.and.returnValue(throwError(null));
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

    it('should emit error when create training instance and stay on edit page fails', (done) => {
        trainingInstanceApiSpy.create.and.returnValue(throwError(null));
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

    it('should update and save snapshot of edited training instance', () => {
        service.change(new TrainingInstanceChangeEvent(createMock(), false));
        service.saveDisabled$.subscribe((idDisabled) => expect(idDisabled).toBeTruthy());
    });

    function createMock() {
        const trainingInstance = new TrainingInstance();
        trainingInstance.id = 0;
        trainingInstance.startTime = new Date();
        return trainingInstance;
    }

    function createPoolsPaginatedMock(): PaginatedResource<Pool> {
        const pool1 = new Pool();
        pool1.id = 0;
        const pool2 = new Pool();
        pool2.id = 1;
        return new PaginatedResource([pool1, pool2], new OffsetPagination(1, 2, 2, 2, 1));
    }

    function createSandboxDefinitionsPaginatedMock(): PaginatedResource<SandboxDefinition> {
        const sandboxDefinition = new SandboxDefinition();
        sandboxDefinition.id = 0;
        sandboxDefinition.rev = 'master';
        sandboxDefinition.url = 'http://example.com';
        sandboxDefinition.title = 'title';
        return new PaginatedResource([sandboxDefinition, sandboxDefinition], new OffsetPagination(1, 2, 2, 2, 1));
    }

    function createTrainingDefinitionsPaginatedMock(): PaginatedResource<TrainingDefinition> {
        const trainingDefinition = new TrainingDefinition();
        trainingDefinition.id = 0;
        trainingDefinition.title = 'title';
        return new PaginatedResource([trainingDefinition, trainingDefinition], new OffsetPagination(1, 2, 2, 2, 1));
    }
});
