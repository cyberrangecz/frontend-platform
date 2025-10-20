import { inject, Injectable } from '@angular/core';
import { OffsetPaginationEvent, PaginatedResource, PaginationBase } from '@sentinel/common/pagination';
import { UserApi, UserRefSort } from '@crczp/training-api';
import { Organizer } from '@crczp/training-model';
import { SentinelUserAssignService } from '@sentinel/components/user-assign';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { UserNameFilters } from '@crczp/training-agenda/internal';
import { ErrorHandlerService } from '@crczp/utils';
import { createPaginatedResource } from '@crczp/api-common';

/**
 * Organizer implementation of UserAssignService from user assign library.
 * Provides context, concrete data and API connection to generic service user assignment service
 */
@Injectable()
export class OrganizersAssignService extends SentinelUserAssignService {
    private userApi = inject(UserApi);
    private errorHandler = inject(ErrorHandlerService);

    private lastAssignedPagination: OffsetPaginationEvent<UserRefSort>;
    private lastAssignedFilter: string;
    private assignedUsersSubject: BehaviorSubject<
        PaginatedResource<Organizer>
    > = new BehaviorSubject(createPaginatedResource());
    /**
     * Currently assigned users (organizers)
     */
    assignedUsers$: Observable<PaginatedResource<Organizer>> =
        this.assignedUsersSubject.asObservable();

    /***
     * Assigns organizer to a resource (creates association)
     * @param resourceId id of resource (training instance for example)
     * @param users list of users (organizers) to assign to a resource
     */
    assign(resourceId: number, users: Organizer[]): Observable<any> {
        const userIds = users.map((user) => user.id);
        return this.callApiToAssign(resourceId, userIds);
    }

    assignSelected(resourceId: number): Observable<any> {
        const userIds = this.selectedUsersToAssignSubject$
            .getValue()
            .map((user) => user.id);
        return this.callApiToAssign(resourceId, userIds as any);
    }

    /**
     * Gets organizers assigned to specific resource and updates related observables or handles error
     * @param resourceId id of resource associated with organizers
     * @param pagination requested pagination
     * @param filter username filter which should be applied on organizers
     */
    getAssigned(
        resourceId: number,
        pagination: PaginationBase<string>,
        filter?: string,
    ): Observable<PaginatedResource<Organizer>> {
        this.clearSelectedAssignedUsers();
        this.lastAssignedPagination = {
            ...pagination,
            page: 0,
            sort: 'family_name',
        };
        this.lastAssignedFilter = filter;
        this.hasErrorSubject$.next(false);
        this.isLoadingAssignedSubject.next(true);
        return this.userApi
            .getOrganizers(
                resourceId,
                this.lastAssignedPagination,
                false,
                UserNameFilters.create(filter),
            )
            .pipe(
                tap(
                    (paginatedUsers) => {
                        this.assignedUsersSubject.next(paginatedUsers);
                        this.isLoadingAssignedSubject.next(false);
                    },
                    (err) => {
                        this.errorHandler.emitAPIError(
                            err,
                            'Fetching organizers',
                        );
                        this.isLoadingAssignedSubject.next(false);
                        this.hasErrorSubject$.next(true);
                    },
                ),
            );
    }

    /**
     * Gets all organizers which are not already associated with selected resource or handles error.
     * @param resourceId id of selected resource
     * @param filter username filter which should be applied on organizers
     */
    getAvailableToAssign(
        resourceId: number,
        filter: string = null,
    ): Observable<PaginatedResource<Organizer>> {
        return this.userApi
            .getOrganizersNotInTI(
                resourceId,
                {
                    page: 0,
                    size: Number.MAX_SAFE_INTEGER,
                    sort: 'family_name',
                    sortDir: 'asc',
                },
                false,
                UserNameFilters.create(filter),
            )
            .pipe(
                tap({
                    error: (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Fetching organizers',
                        ),
                }),
            );
    }

    /**
     * Deletes association between selected organizers and resource and refreshes observable of already assigned organizers or handles error
     * @param resourceId id of selected resource
     * @param users organizers whose association should be deleted
     */
    unassign(resourceId: number, users: Organizer[]): Observable<any> {
        const userIds = users.map((user) => user.id);
        return this.callApiToUnassign(resourceId, userIds);
    }

    unassignSelected(resourceId: number): Observable<any> {
        const userIds = this.selectedAssignedUsersSubject$
            .getValue()
            .map((user) => user.id);
        return this.callApiToUnassign(resourceId, userIds as any);
    }

    /**
     * Adds and removes associations between selected organizers and resource. Refreshes observable of already
     * assigned organizers or handles error
     * @param resourceId id of selected resource
     * @param additions users to assign to selected resource
     * @param removals users whose association with resource should be removed
     */
    update(
        resourceId: number,
        additions: Organizer[],
        removals: Organizer[],
    ): Observable<any> {
        return this.userApi
            .updateOrganizers(
                resourceId,
                additions.map((user) => user.id),
                false,
                removals.map((user) => user.id),
            )
            .pipe(
                tap({
                    error: (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Updating organizers',
                        ),
                }),
                switchMap(() =>
                    this.getAssigned(
                        resourceId,
                        this.lastAssignedPagination,
                        this.lastAssignedFilter,
                    ),
                ),
            );
    }
    private callApiToAssign(
        resourceId: number,
        userIds: number[],
    ): Observable<any> {
        return this.userApi
            .updateOrganizers(resourceId, userIds, false, [])
            .pipe(
                tap(
                    () => this.clearSelectedUsersToAssign(),
                    (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Assigning organizers to training instance',
                        ),
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

    private callApiToUnassign(
        resourceId: number,
        userIds: number[],
    ): Observable<any> {
        return this.userApi
            .updateOrganizers(resourceId, [], false, userIds)
            .pipe(
                tap(
                    () => this.clearSelectedAssignedUsers(),
                    (err) =>
                        this.errorHandler.emitAPIError(
                            err,
                            'Deleting organizers from training instance',
                        ),
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
