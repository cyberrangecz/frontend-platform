import { TestBed, waitForAsync } from '@angular/core/testing';
import { asyncData } from '@sentinel/common/testing';
import { OffsetPagination, OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { UserApi } from '@crczp/training-api';
import { throwError } from 'rxjs';
import { skip, take } from 'rxjs/operators';
import {
    createContext,
    createErrorHandlerSpy,
    createUserApiSpy,
} from '../../../../../internal/src/testing/testing-commons.spec';
import { TrainingErrorHandler } from '../../../../../src/services/training-error.handler.service';
import { TrainingAgendaContext } from '../../../../../internal/src/services/context/training-agenda-context.service';
import { OrganizersAssignService } from './organizers-assign.service';
import { Organizer } from '@crczp/training-model';

describe('OrganizersAssignService', () => {
    let errorHandlerSpy: jasmine.SpyObj<TrainingErrorHandler>;
    let apiSpy: jasmine.SpyObj<UserApi>;
    let service: OrganizersAssignService;
    let context: TrainingAgendaContext;

    beforeEach(waitForAsync(() => {
        errorHandlerSpy = createErrorHandlerSpy();
        apiSpy = createUserApiSpy();
        context = createContext();

        TestBed.configureTestingModule({
            providers: [
                OrganizersAssignService,
                { provide: UserApi, useValue: apiSpy },
                { provide: TrainingErrorHandler, useValue: errorHandlerSpy },
                { provide: TrainingAgendaContext, useValue: context },
            ],
        });
        service = TestBed.inject(OrganizersAssignService);
    }));

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should load available organizers from facade (called once)', (done) => {
        apiSpy.getOrganizers.and.returnValue(asyncData(createMock()));
        const pagination = createPagination();
        service.getAssigned(0, pagination).subscribe(() => done(), fail);
        expect(apiSpy.getOrganizers).toHaveBeenCalledTimes(1);
    });

    it('should load assigned organizers from facade (called once)', (done) => {
        apiSpy.getOrganizersNotInTI.and.returnValue(asyncData(createMock()));
        service.getAvailableToAssign(0).subscribe(() => done(), fail);
        expect(apiSpy.getOrganizersNotInTI).toHaveBeenCalledTimes(1);
    });

    it('should assign organizers through facade (called once)', (done) => {
        apiSpy.updateOrganizers.and.returnValue(asyncData(null));
        apiSpy.getOrganizers.and.returnValue(asyncData(createMock()));
        const usersToAssign = createMock().elements;
        const idsToAssign = usersToAssign.map((user) => user.id);
        service.assign(0, usersToAssign).subscribe(() => done(), fail);
        expect(apiSpy.updateOrganizers).toHaveBeenCalledTimes(1);
        expect(apiSpy.updateOrganizers).toHaveBeenCalledWith(0, idsToAssign, true, []);
    });

    it('should refresh organizers after assign action', (done) => {
        apiSpy.updateOrganizers.and.returnValue(asyncData(null));
        apiSpy.getOrganizers.and.returnValue(asyncData(createMock()));
        const usersToAssign = createMock().elements;
        service.assign(0, usersToAssign).subscribe(() => {
            expect(apiSpy.getOrganizers).toHaveBeenCalledTimes(1);
            done();
        }, fail);
    });

    it('should unassign organizers through facade (called once)', (done) => {
        apiSpy.updateOrganizers.and.returnValue(asyncData(null));
        apiSpy.getOrganizers.and.returnValue(asyncData(createMock()));
        const usersToUnassign = createMock().elements;
        const idsToUnassign = usersToUnassign.map((user) => user.id);
        service.unassign(0, usersToUnassign).subscribe(() => done(), fail);
        expect(apiSpy.updateOrganizers).toHaveBeenCalledTimes(1);
        expect(apiSpy.updateOrganizers).toHaveBeenCalledWith(0, [], true, idsToUnassign);
    });

    it('should refresh asssigned organizers after unassign action', (done) => {
        apiSpy.updateOrganizers.and.returnValue(asyncData(null));
        apiSpy.getOrganizers.and.returnValue(asyncData(createMock()));
        const usersToUnassign = createMock().elements;
        service.unassign(0, usersToUnassign).subscribe(() => {
            expect(apiSpy.updateOrganizers).toHaveBeenCalledTimes(1);
            done();
        }, fail);
    });

    it('should call error handler on err (getAvailableToAssign)', (done) => {
        apiSpy.getOrganizersNotInTI.and.returnValue(throwError(null));
        service.getAvailableToAssign(0).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    it('should call error handler on err (getAssigned)', (done) => {
        apiSpy.getOrganizers.and.returnValue(throwError(null));
        service.getAssigned(0, null).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    it('should call error handler on err (assign)', (done) => {
        apiSpy.updateOrganizers.and.returnValue(throwError(null));
        service.assign(0, []).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    it('should call error handler on err (unassign)', (done) => {
        apiSpy.updateOrganizers.and.returnValue(throwError(null));
        service.unassign(0, []).subscribe(
            () => fail,
            () => {
                expect(errorHandlerSpy.emit).toHaveBeenCalledTimes(1);
                done();
            },
        );
    });

    it('should emit hasError on err', (done) => {
        apiSpy.getOrganizers.and.returnValue(throwError(null));
        const pagination = createPagination();
        service.hasError$
            .pipe(skip(2)) // we ignore initial value and value emitted before the call is made
            .subscribe((emitted) => {
                expect(emitted).toBeTruthy();
                done();
            }, fail);
        service
            .getAssigned(0, pagination)
            .pipe(take(1))
            .subscribe(fail, (_) => _);
    });

    it('should emit next value on get assigned organizers', (done) => {
        const mockData = createMock();
        apiSpy.getOrganizers.and.returnValue(asyncData(mockData));
        const pagination = createPagination();
        service.assignedUsers$.pipe(skip(1)).subscribe((emitted) => {
            expect(emitted).toBe(mockData);
            done();
        }, fail);
        service
            .getAssigned(0, pagination)
            .pipe(take(1))
            .subscribe((_) => _, fail);
    });

    function createPagination() {
        return new OffsetPaginationEvent(1, 5, '', 'asc');
    }

    function createMock() {
        const user1: Organizer = { id: 1, name: '', login: '', mail: '', picture: '' };
        const user2: Organizer = { id: 2, name: '', login: '', mail: '', picture: '' };
        return new PaginatedResource([user1, user2], new OffsetPagination(1, 2, 5, 2, 1));
    }
});
