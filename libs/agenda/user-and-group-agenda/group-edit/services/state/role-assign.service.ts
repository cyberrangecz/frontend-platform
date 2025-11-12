import { inject, Injectable } from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { GroupApi, RoleApi, RoleSort } from '@crczp/user-and-group-api';
import { UserRole } from '@crczp/user-and-group-model';
import { BehaviorSubject, forkJoin, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { RoleFilter } from '@crczp/user-and-group-agenda/internal';
import { ErrorHandlerService } from '@crczp/utils';
import {
    createInfinitePaginatedResource,
    createInfinitePaginationEvent,
    OffsetPaginatedResource,
    QueryParam
} from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get roles assigned to a resource and roles available to assign and perform assignment modifications.
 */
@Injectable()
export class RoleAssignService {
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
    protected selectedRolesToAssignSubject$: BehaviorSubject<UserRole[]> =
        new BehaviorSubject([]);
    selectedRolesToAssign$: Observable<UserRole[]> =
        this.selectedRolesToAssignSubject$;
    protected selectedAssignedRolesSubject$: BehaviorSubject<UserRole[]> =
        new BehaviorSubject([]);
    selectedAssignedRoles$: Observable<UserRole[]> =
        this.selectedAssignedRolesSubject$.asObservable();
    private api = inject(GroupApi);
    private roleApi = inject(RoleApi);
    private errorHandler = inject(ErrorHandlerService);
    private assignedRolesSubject$: BehaviorSubject<
        OffsetPaginatedResource<UserRole>
    > = new BehaviorSubject(createInfinitePaginatedResource());
    /**
     * Subscribe to receive assigned roles
     */
    assignedRoles$: Observable<OffsetPaginatedResource<UserRole>> =
        this.assignedRolesSubject$.asObservable();
    private lastPagination: OffsetPaginationEvent<RoleSort>;
    private lastFilter: string;

    setSelectedRolesToAssign(roles: UserRole[]): void {
        this.selectedRolesToAssignSubject$.next(roles);
    }

    clearSelectedRolesToAssign(): void {
        this.selectedRolesToAssignSubject$.next([]);
    }

    setSelectedAssignedRoles(roles: UserRole[]): void {
        this.selectedAssignedRolesSubject$.next(roles);
    }

    clearSelectedAssignedRoles(): void {
        this.selectedAssignedRolesSubject$.next([]);
    }

    /**
     * Gets roles available to assign
     * @param filterValue filter to be applied on roles
     * @param resourceId id of a resource of which roles should be excluded from result
     * @returns roles available to assign
     */
    getAvailableToAssign(
        resourceId: number,
        filterValue: string = null,
    ): Observable<OffsetPaginatedResource<UserRole>> {
        const filter = filterValue ? [new RoleFilter(filterValue)] : [];
        return this.roleApi
            .getRolesNotInGroup(
                resourceId,
                createInfinitePaginationEvent('roleType'),
                filter,
            )
            .pipe(
                tap({
                    error: (err) =>
                        this.errorHandler.emitAPIError(err, 'Fetching roles'),
                }),
            );
    }

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
    ): Observable<OffsetPaginatedResource<UserRole>> {
        this.lastPagination = pagination;
        this.lastFilter = filterValue;
        const filter = filterValue
            ? [new QueryParam('roleType', filterValue)]
            : [];
        this.clearSelectedAssignedRoles();
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

    /**
     * Assigns (associates) roles with a resource, updates related observables or handles error
     * @param resourceId id of a resource to be associated with selected roles
     * @param roles roles to be assigned to a resource
     */
    assign(resourceId: number, roles: UserRole[]): Observable<any> {
        const roleIds = roles.map((role) => role.id);
        return this.callApiToAssign(resourceId, roleIds);
    }

    assignSelected(resourceId: number): Observable<any> {
        const roleIds = this.selectedRolesToAssignSubject$
            .getValue()
            .map((role) => role.id);
        return this.callApiToAssign(resourceId, roleIds);
    }

    /**
     * Unassigns (cancels association) roles from a resource
     * @param resourceId id of a resource which associations should be cancelled
     * @param roles roles to be unassigned from a resource
     */
    unassign(resourceId: number, roles: UserRole[]): Observable<any> {
        const roleIds = roles.map((role) => role.id);
        return this.callApiToUnassign(resourceId, roleIds);
    }

    unassignSelected(resourceId: number): Observable<any> {
        const roleIds = this.selectedAssignedRolesSubject$
            .getValue()
            .map((role) => role.id);
        return this.callApiToUnassign(resourceId, roleIds);
    }

    private callApiToAssign(resourceId: number, roleIds: number[]) {
        this.clearSelectedRolesToAssign();
        return forkJoin(
            roleIds.map((id) => this.api.assignRole(resourceId, id)),
        ).pipe(
            catchError(() => of('failed')),
            tap((results: any[]) => {
                const failedRequests = results.filter(
                    (result) => result === 'failed',
                );
                if (failedRequests.length > 1) {
                    this.errorHandler.emitAPIError(
                        undefined,
                        'Assigning some roles failed',
                    );
                }
            }),
            switchMap(() =>
                this.getAssigned(
                    resourceId,
                    this.lastPagination,
                    this.lastFilter,
                ),
            ),
        );
    }

    private callApiToUnassign(resourceId: number, roleIds: number[]) {
        this.clearSelectedAssignedRoles();
        return forkJoin(
            roleIds.map((id) => this.api.removeRole(resourceId, id)),
        ).pipe(
            catchError(() => of('failed')),
            tap((results: any[]) => {
                const failedRequests = results.filter(
                    (result) => result === 'failed',
                );
                if (failedRequests.length > 1) {
                    this.errorHandler.emitAPIError(
                        undefined,
                        'Assigning some roles failed',
                    );
                }
            }),
            switchMap(() =>
                this.getAssigned(
                    resourceId,
                    this.lastPagination,
                    this.lastFilter,
                ),
            ),
        );
    }
}
