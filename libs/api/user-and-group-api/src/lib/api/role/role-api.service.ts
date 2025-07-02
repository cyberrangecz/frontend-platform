import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {SentinelFilter} from '@sentinel/common/filter';
import {User, UserRole} from '@crczp/user-and-group-model';
import {Observable} from 'rxjs';

/**
 * Abstraction of http communication with roles endpoint
 */
export abstract class RoleApi {
    /**
     * Sends http request to get paginated roles
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    abstract getAll(
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<UserRole>>;

    /**
     * Sends http request to get roles not already assigned to group
     * @param groupId id of group
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    abstract getRolesNotInGroup(
        groupId: number,
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<UserRole>>;

    /**
     * Sends http request to get role by id
     * @param id id of requested role
     */
    abstract get(id: number): Observable<UserRole>;

    /**
     * Sends http request to get all users wit given role id
     * @param id id of requested role
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    abstract getUsersForRole(
        id: number,
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<User>>;

    /**
     * Sends http request to get all users wit given role type
     * @param type type of requested role
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    abstract getUsersForRoleType(
        type: string,
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<User>>;

    /**
     * Sends http request to get all users wit given role type and not with given id
     * @param type type of requested role
     * @param ids ids of users to be excluded from result
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    abstract getUsersNotWithIds(
        type: string,
        ids: number[],
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<User>>;
}
