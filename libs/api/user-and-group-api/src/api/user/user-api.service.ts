import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {SentinelFilter} from '@sentinel/common/filter';
import {User, UserRole} from '@crczp/user-and-group-model';
import {Observable} from 'rxjs';

/**
 * Service abstracting http communication with user endpoints
 */
export abstract class UserApi {
    /**
     * Sends http request to get paginated users
     * @param pagination requested pagination
     * @param filter filter to be applied on users
     */
    abstract getAll(pagination: OffsetPaginationEvent, filter?: SentinelFilter[]): Observable<PaginatedResource<User>>;

    /**
     * Sends http request to get user by id
     * @param id id of requested user
     */
    abstract get(id: number): Observable<User>;

    /**
     * Sends http request to delete multiple users
     * @param userIds ids of users to delete
     */
    abstract deleteMultiple(userIds: number[]): Observable<any>;

    /**
     * Sends http request to get users that are not members of provided group
     * @param groupId id of a group that has no association with requested users
     * @param pagination requested pagination
     * @param filters filters to be applied on users
     */
    abstract getUsersNotInGroup(
        groupId: number,
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<User>>;

    /**
     * Sends http request to get users that are members of provided groups
     * @param groupIds ids of a groups that are associated with requested users
     * @param pagination requested pagination
     * @param filters filters to be applied on users
     */
    abstract getUsersInGroups(
        groupIds: number[],
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<User>>;

    /**
     * Sends http request to delete user
     * @param userId id of user to delete
     */
    abstract delete(userId: number): Observable<any>;

    /**
     * Sends http request to get roles for given user id
     * @param userId id of user to get roles for
     */
    abstract getUserRoles(userId: number): Observable<PaginatedResource<UserRole>>;

    /**
     * Sends http request to get multiplle users by their ids
     * @param userIds id of users to get
     */
    abstract getUsersByIds(userIds: number): Observable<PaginatedResource<User>>;

    /**
     * Sends http request to get details of user who is logged in
     */
    abstract getUsersInfo(): Observable<User>;

    /**
     * Sends http request to get local OIDC users
     */
    abstract getLocalOIDCUsers(): Observable<boolean>;

    /**
     * Sends http request to import users
     */
    abstract importUsers(file: File): Observable<any>;
}
