import { inject, Injectable } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { GroupApi, UserApi, UserSort } from '@crczp/user-and-group-api';
import { Group, User } from '@crczp/user-and-group-model';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { GroupFilter, UserFilter } from '@crczp/user-and-group-agenda/internal';
import { ErrorHandlerService } from '@crczp/utils';
import { createInfinitePaginationEvent, OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get users assigned to resource and users/groups available to assign and perform assignment modifications.
 */
@Injectable()
export class UserAssignService {
    protected hasErrorSubject$: BehaviorSubject<boolean> = new BehaviorSubject(
        false,
    );
    /**
     * True if error was returned from API, false otherwise
     */
    hasError$: Observable<boolean> = this.hasErrorSubject$.asObservable();
    protected isLoadingAssignedSubject$ = new BehaviorSubject<boolean>(false);
    /**
     * True if service is waiting on response from API for request to get assigned users
     */
    isLoadingAssigned$: Observable<boolean> =
        this.isLoadingAssignedSubject$.asObservable();
    protected selectedUsersToAssignSubject$: BehaviorSubject<User[]> =
        new BehaviorSubject<User[]>([]);
    selectedUsersToAssign$: Observable<User[]> =
        this.selectedUsersToAssignSubject$.asObservable();
    protected selectedAssignedUsersSubject$: BehaviorSubject<User[]> =
        new BehaviorSubject<User[]>([]);
    selectedAssignedUsers$: Observable<User[]> =
        this.selectedAssignedUsersSubject$.asObservable();
    protected selectedGroupsToImportSubject$: BehaviorSubject<Group[]> =
        new BehaviorSubject<Group[]>([]);
    selectedGroupsToImport$: Observable<Group[]> =
        this.selectedGroupsToImportSubject$.asObservable();
    private api = inject(GroupApi);
    private userApi = inject(UserApi);
    private errorHandler = inject(ErrorHandlerService);
    private assignedUsersSubject$: Subject<OffsetPaginatedResource<User>> =
        new Subject();
    assignedUsers$: Observable<OffsetPaginatedResource<User>> =
        this.assignedUsersSubject$.asObservable();

    private lastAssignedPagination: OffsetPaginationEvent<UserSort>;
    private lastAssignedFilter: string;

    setSelectedUsersToAssign(users: User[]): void {
        this.selectedUsersToAssignSubject$.next(users);
    }

    clearSelectedUsersToAssign(): void {
        this.selectedUsersToAssignSubject$.next([]);
    }

    setSelectedAssignedUsers(users: User[]): void {
        this.selectedAssignedUsersSubject$.next(users);
    }

    clearSelectedAssignedUsers(): void {
        this.selectedAssignedUsersSubject$.next([]);
    }

    setSelectedGroupsToImport(groups: Group[]): void {
        this.selectedGroupsToImportSubject$.next(groups);
    }

    clearSelectedGroupsToImport(): void {
        this.selectedGroupsToImportSubject$.next([]);
    }

    /**
     * Gets users available to assign to a resource
     * @param resourceId id of a resource which has no association with users
     * @param filterValue filter to be applied on users
     */
    getUsersToAssign(
        resourceId: number,
        filterValue: string,
    ): Observable<OffsetPaginatedResource<User>> {
        return this.userApi
            .getUsersNotInGroup(
                resourceId,
                createInfinitePaginationEvent('fullName'),
                [new UserFilter(filterValue)],
            )
            .pipe(
                tap({
                    error: (err) =>
                        this.errorHandler.emitAPIError(err, 'Fetching users'),
                }),
            );
    }

    /**
     * Get groups available to import (assign its users to a resource)
     * @param filterValue filter to be applied on groups
     */
    getGroupsToImport(
        filterValue: string,
    ): Observable<OffsetPaginatedResource<Group>> {
        return this.api
            .getAll(createInfinitePaginationEvent('name'), [
                new GroupFilter(filterValue),
            ])
            .pipe(
                tap({
                    error: (err) =>
                        this.errorHandler.emitAPIError(err, 'Fetching groups'),
                }),
            );
    }

    /**
     * Gets users assigned to a resource with passed pagination and updates related observables or handles an error
     * @param resourceId id of a resource associated with requested users
     * @param pagination requested pagination
     * @param filterValue filter to be applied on users
     */
    getAssigned(
        resourceId: number,
        pagination: OffsetPaginationEvent<UserSort>,
        filterValue: string = null,
    ): Observable<OffsetPaginatedResource<User>> {
        this.clearSelectedAssignedUsers();
        const filter = filterValue ? [new UserFilter(filterValue)] : [];
        this.lastAssignedPagination = pagination;
        console.log('Requested pagination:', pagination);
        this.lastAssignedFilter = filterValue;
        this.hasErrorSubject$.next(false);
        this.isLoadingAssignedSubject$.next(true);
        return this.userApi
            .getUsersInGroups([resourceId], pagination, filter)
            .pipe(
                tap(
                    (paginatedUsers) => {
                        this.assignedUsersSubject$.next(paginatedUsers);
                        this.isLoadingAssignedSubject$.next(false);
                    },
                    (err) => {
                        this.errorHandler.emitAPIError(err, 'Fetching users');
                        this.isLoadingAssignedSubject$.next(false);
                        this.hasErrorSubject$.next(true);
                    },
                ),
            );
    }

    /**
     * Assigns (associates) selected users or groups to a resource
     * @param resourceId id of a resource with which users and groups should be associated
     */
    assignSelected(resourceId: number): Observable<any> {
        const userIds = this.selectedUsersToAssignSubject$
            .getValue()
            .map((user) => user.id);
        const groupIds = this.selectedGroupsToImportSubject$
            .getValue()
            .map((group) => group.id);
        return this.callApiToAssign(resourceId, userIds, groupIds);
    }

    assign(
        resourceId: number,
        users: User[],
        groups?: Group[],
    ): Observable<any> {
        const userIds = users.map((user) => user.id);
        const groupIds = groups.map((group) => group.id);
        return this.callApiToAssign(resourceId, userIds, groupIds);
    }

    /**
     * Unassigns (cancels association) users from a resource
     * @param resourceId id of a resource which association should be canceled
     * @param users users to unassign
     */
    unassign(resourceId: number, users: User[]): Observable<any> {
        const userIds = users.map((user) => user.id);
        return this.callApiToUnassign(resourceId, userIds);
    }

    unassignSelected(resourceId: number): Observable<any> {
        const userIds = this.selectedAssignedUsersSubject$
            .getValue()
            .map((user) => user.id);
        return this.callApiToUnassign(resourceId, userIds);
    }

    private callApiToAssign(
        resourceId: number,
        userIds: number[],
        groupIds: number[],
    ) {
        return this.api.addUsersToGroup(resourceId, userIds, groupIds).pipe(
            tap(
                () => {
                    this.clearSelectedUsersToAssign();
                    this.clearSelectedGroupsToImport();
                },
                (err) => this.errorHandler.emitAPIError(err, 'Adding users'),
            ),
            switchMap(() =>
                this.getAssigned(
                    resourceId,
                    this.lastAssignedPagination,
                    this.lastAssignedFilter,
                ),
            ),
        );
    }

    private callApiToUnassign(resourceId: number, userIds: number[]) {
        return this.api.removeUsersFromGroup(resourceId, userIds).pipe(
            tap(
                () => this.clearSelectedAssignedUsers(),
                (err) => this.errorHandler.emitAPIError(err, 'Removing users'),
            ),
            switchMap(() =>
                this.getAssigned(
                    resourceId,
                    this.lastAssignedPagination,
                    this.lastAssignedFilter,
                ),
            ),
        );
    }
}
