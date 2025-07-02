import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {SentinelParamsMerger} from '@sentinel/common';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {SentinelFilter} from '@sentinel/common/filter';
import {User, UserRole} from '@crczp/user-and-group-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {RoleDTO} from '../../DTO/role/role-dto';
import {UserAndGroupUserDTO} from '../../DTO/user/user-dto.model';
import {RoleMapper} from '../../mappers/role-mapper';
import {UserMapper} from '../../mappers/user.mapper';
import {UserAndGroupApiConfig} from '../../other/user-and-group-api-config';
import {UserAndGroupContext} from '../../other/user-and-group.context.service';
import {RoleApi} from './role-api.service';
import {JavaPaginatedResource, ParamsBuilder} from '@crczp/api-common';

/**
 * Default implementation of service abstracting http communication with roles endpoint
 */
@Injectable()
export class RoleDefaultApi extends RoleApi {
    private readonly config: UserAndGroupApiConfig;
    private readonly rolesPathExtension = 'roles';

    constructor(
        private http: HttpClient,
        private context: UserAndGroupContext,
    ) {
        super();
        this.config = this.context.config;
    }

    /**
     * Sends http request to get paginated roles
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getAll(pagination: OffsetPaginationEvent, filters: SentinelFilter[] = []): Observable<PaginatedResource<UserRole>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<RoleDTO>
            >(`${this.config.userAndGroupRestBasePath}${this.rolesPathExtension}`, { params })
            .pipe(map((resp) => RoleMapper.mapPaginatedRolesDTOtoRoles(resp)));
    }

    /**
     * Sends http request to get roles not already assigned to group
     * @param groupId id of group
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getRolesNotInGroup(
        groupId: number,
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<UserRole>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<RoleDTO>
            >(`${this.config.userAndGroupRestBasePath}${this.rolesPathExtension}/not-in-group/${groupId}`, { params })
            .pipe(map((resp) => RoleMapper.mapPaginatedRolesDTOtoRoles(resp)));
    }

    /**
     * Sends http request to get role by id
     * @param id id of requested role
     */
    get(id: number): Observable<UserRole> {
        return this.http
            .get<RoleDTO>(`${this.config.userAndGroupRestBasePath}${this.rolesPathExtension}/${id}`)
            .pipe(map((resp) => RoleMapper.mapRoleDTOToRole(resp)));
    }

    /**
     * Sends http request to get all users wit given role id
     * @param id id of requested role
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getUsersForRole(
        id: number,
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<User>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
        ]);
        return this.http
            .get<JavaPaginatedResource<UserAndGroupUserDTO>>(
                `${this.config.userAndGroupRestBasePath}${this.rolesPathExtension}/${id}/users`,
                {
                    params,
                },
            )
            .pipe(map((resp) => UserMapper.mapUserDTOsToUsers(resp)));
    }

    /**
     * Sends http request to get all users wit given role type
     * @param type type of requested role
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getUsersForRoleType(
        type: string,
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<User>> {
        const typeParam = new HttpParams().set('roleType', type);
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
            typeParam,
        ]);
        return this.http
            .get<JavaPaginatedResource<UserAndGroupUserDTO>>(`${this.config.userAndGroupRestBasePath}${this.rolesPathExtension}/users`, {
                params,
            })
            .pipe(map((resp) => UserMapper.mapUserDTOsToUsers(resp)));
    }

    /**
     * Sends http request to get all users wit given role type and not with given id
     * @param type type of requested role
     * @param ids ids of users to be excluded from result
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getUsersNotWithIds(
        type: string,
        ids: number[],
        pagination: OffsetPaginationEvent,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<User>> {
        const idParams = new HttpParams().set('ids', ids.toString());
        const typeParam = new HttpParams().set('roleType', type);
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filters),
            idParams,
            typeParam,
        ]);
        return this.http
            .get<
                JavaPaginatedResource<UserAndGroupUserDTO>
            >(`${this.config.userAndGroupRestBasePath}${this.rolesPathExtension}/users-not-with-ids`, { params })
            .pipe(map((resp) => UserMapper.mapUserDTOsToUsers(resp)));
    }
}
