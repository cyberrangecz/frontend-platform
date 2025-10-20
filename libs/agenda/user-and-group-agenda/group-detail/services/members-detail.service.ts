import { inject, Injectable } from '@angular/core';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { UserApi, UserSort } from '@crczp/user-and-group-api';
import { User } from '@crczp/user-and-group-model';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { UserFilter } from '@crczp/user-and-group-agenda/internal';
import { createInfinitePaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get users assigned to resource and users/groups available to assign and perform assignment modifications.
 */
@Injectable()
export class MembersDetailService {
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
    private userApi = inject(UserApi);
    private errorHandler = inject(ErrorHandlerService);
    private assignedUsersSubject$: BehaviorSubject<PaginatedResource<User>> =
        new BehaviorSubject(createInfinitePaginatedResource());
    /**
     * Subscribe to receive assigned users
     */
    assignedUsers$: Observable<PaginatedResource<User>> =
        this.assignedUsersSubject$.asObservable();

    private readonly defaultPaginationSize: number;

    constructor() {
        const settings = inject(PortalConfig);

        this.defaultPaginationSize = settings.defaultPageSize;
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
    ): Observable<PaginatedResource<User>> {
        const filter = filterValue ? [new UserFilter(filterValue)] : [];
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
}
