import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SentinelParamsMerger } from '@sentinel/common';
import { OffsetPaginationEvent } from '@crczp/utils';
import { User, UserRole } from '@crczp/user-and-group-model';
import { Observable } from 'rxjs';
import { RoleDTO } from '../DTO/role/role-dto';
import { UserAndGroupUserDTO } from '../DTO/user/user-dto.model';
import { RoleMapper } from '../mappers/role-mapper';
import { UserMapper } from '../mappers/user.mapper';
import {
    CRCZPHttpService,
    JavaPaginatedResource,
    OffsetPaginatedResource,
    ParamsBuilder,
    QueryParam,
} from '@crczp/api-common';
import { PortalConfig } from '@crczp/utils';
import { RoleSort, UserSort } from './sort';

/**
 * Default implementation of service abstracting http communication with roles endpoint
 */
@Injectable()
export class RoleApi {
    private readonly http = inject(CRCZPHttpService);

    private readonly apiUrl =
        inject(PortalConfig).basePaths.userAndGroup + '/roles';

    /**
     * Sends http request to get paginated roles
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getAll(
        pagination: OffsetPaginationEvent<UserSort>,
        filters: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<UserRole>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<JavaPaginatedResource<RoleDTO>>(
                this.apiUrl,
                'Fetching roles',
            )
            .withParams(params)
            .withCache('12h')
            .withMapper((resp) => RoleMapper.mapPaginatedRolesDTOtoRoles(resp))
            .execute();
    }

    /**
     * Sends http request to get roles not already assigned to group
     * @param groupId id of group
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getRolesNotInGroup(
        groupId: number,
        pagination: OffsetPaginationEvent<RoleSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<UserRole>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<JavaPaginatedResource<RoleDTO>>(
                `${this.apiUrl}/not-in-group/${groupId}`,
                'Fetching roles not in group',
            )
            .withParams(params)
            .withMapper((resp) => RoleMapper.mapPaginatedRolesDTOtoRoles(resp))
            .execute();
    }

    /**
     * Sends http request to get role by id
     * @param id id of requested role
     */
    get(id: number): Observable<UserRole> {
        return this.http
            .get<RoleDTO>(`${this.apiUrl}/${id}`, 'Fetching role')
            .withMapper((resp) => RoleMapper.mapRoleDTOToRole(resp))
            .execute();
    }

    /**
     * Sends http request to get all users wit given role id
     * @param id id of requested role
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getUsersForRole(
        id: number,
        pagination: OffsetPaginationEvent<UserSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<User>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
        ]);
        return this.http
            .get<JavaPaginatedResource<UserAndGroupUserDTO>>(
                `${this.apiUrl}/${id}/users`,
                'Fetching users of role',
            )
            .withParams(params)
            .withMapper((resp) => UserMapper.mapUserDTOsToUsers(resp))
            .execute();
    }

    /**
     * Sends http request to get all users wit given role type
     * @param type type of requested role
     * @param pagination requested pagination
     * @param filters filters to be applied on roles
     */
    getUsersForRoleType(
        type: string,
        pagination: OffsetPaginationEvent<UserSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<User>> {
        const typeParam = new HttpParams().set('roleType', type);
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
            typeParam,
        ]);
        return this.http
            .get<JavaPaginatedResource<UserAndGroupUserDTO>>(
                `${this.apiUrl}/users`,
                'Fetching users of role type',
            )
            .withParams(params)
            .withMapper((resp) => UserMapper.mapUserDTOsToUsers(resp))
            .execute();
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
        pagination: OffsetPaginationEvent<UserSort>,
        filters?: QueryParam[],
    ): Observable<OffsetPaginatedResource<User>> {
        const idParams = new HttpParams().set('ids', ids.toString());
        const typeParam = new HttpParams().set('roleType', type);
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filters),
            idParams,
            typeParam,
        ]);
        return this.http
            .get<JavaPaginatedResource<UserAndGroupUserDTO>>(
                `${this.apiUrl}/users-not-with-ids`,
                'Fetching users without given ids',
            )
            .withParams(params)
            .withMapper((resp) => UserMapper.mapUserDTOsToUsers(resp))
            .execute();
    }
}
