import { inject, Injectable } from '@angular/core';
import { GroupApi, RoleSort } from '@crczp/user-and-group-api';
import { UserRole } from '@crczp/user-and-group-model';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ErrorHandlerService } from '@crczp/utils';
import { createInfinitePaginatedResource, QueryParam } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get users assigned to resource and users/groups available to assign and perform assignment modifications.
 */
@Injectable()
export class RolesDetailService {
    /**
     * List of roles already assigned to the resource
     */
    assignedRoles$: Observable<PaginatedResource<UserRole>>;
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
    private api = inject(GroupApi);
    private errorHandler = inject(ErrorHandlerService);
    private assignedRolesSubject$: BehaviorSubject<
        PaginatedResource<UserRole>
    > = new BehaviorSubject(createInfinitePaginatedResource());

    /**
     * Gets roles assigned to a resource, updates related observables or handles error
     * @param resourceId id of a resource associated with requested roles
     * @param pagination requested pagination
     * @param filterValue filter to be applied on result
     */
    getAssigned(
        resourceId: number,
        pagination: OffsetPaginationEvent<RoleSort>,
        filterValue: string = null,
    ): Observable<PaginatedResource<UserRole>> {
        const filter = filterValue
            ? [new QueryParam('roleType', filterValue)]
            : [];
        this.hasErrorSubject$.next(false);
        this.isLoadingAssignedSubject$.next(true);
        return this.api.getRolesOfGroup(resourceId, pagination, filter).pipe(
            tap(
                (roles) => {
                    this.assignedRolesSubject$.next(roles);
                    this.isLoadingAssignedSubject$.next(false);
                },
                (err) => {
                    this.errorHandler.emitAPIError(
                        err,
                        'Fetching roles of group-overview',
                    );
                    this.isLoadingAssignedSubject$.next(false);
                    this.hasErrorSubject$.next(true);
                },
            ),
        );
    }
}
