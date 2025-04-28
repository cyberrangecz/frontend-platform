import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SentinelParamsMerger } from '@sentinel/common';
import { SentinelFilter } from '@sentinel/common/filter';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Group, UserRole } from '@crczp/user-and-group-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GroupDTO } from '../../DTO/group/group-dto.model';
import { RoleDTO } from '../../DTO/role/role-dto';
import { GroupMapper } from '../../mappers/group.mapper';
import { RoleMapper } from '../../mappers/role-mapper';
import { UserAndGroupApiConfig } from '../../other/user-and-group-api-config';
import { UserAndGroupContext } from '../../other/user-and-group.context.service';
import { GroupApi } from './group-api.service';
import { JavaPaginatedResource, ParamsBuilder } from '@crczp/api-common';

/**
 * Default implementation of service abstracting http communication with group endpoints.
 */
@Injectable()
export class GroupDefaultApi extends GroupApi {
    private readonly config: UserAndGroupApiConfig;
    private readonly groupsPathExtension = 'groups';
    private readonly usersPathExtension = 'users';
    private readonly rolesPathExtension = 'roles';

    constructor(
        private http: HttpClient,
        private context: UserAndGroupContext,
    ) {
        super();
        this.config = this.context.config;
    }

    /**
     * Sends http request to get paginated groups
     * @param pagination requested pagination
     * @param filter filter to be applied on groups
     */
    getAll(pagination: OffsetPaginationEvent, filter: SentinelFilter[] = []): Observable<PaginatedResource<Group>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filter),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<GroupDTO>
            >(`${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}`, { params })
            .pipe(map((resp) => GroupMapper.mapPaginatedGroupDTOsToGroups(resp)));
    }

    /**
     * Sends http request to get group by id
     * @param groupId id of requested group
     */
    get(groupId: number): Observable<Group> {
        return this.http
            .get<GroupDTO>(`${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}/${groupId}`)
            .pipe(map((groupDTO) => GroupMapper.mapGroupDTOToGroup(groupDTO)));
    }

    /**
     * Sends http request to create new group
     * @param group group to create
     * @param groupsToImportFromId ids of groups to import users from
     */
    create(group: Group, groupsToImportFromId: number[] = []): Observable<number> {
        return this.http
            .post<GroupDTO>(
                `${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}`,
                GroupMapper.mapGroupToCreateGroupDTO(group, groupsToImportFromId),
            )
            .pipe(map((groupDTO) => groupDTO.id));
    }

    /**
     * Sends http request to update existing group
     * @param group group to update
     */
    update(group: Group): Observable<any> {
        return this.http.put(
            `${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}`,
            GroupMapper.mapGroupToUpdateGroupDTO(group),
        );
    }

    /**
     * Sends http request to delete multiple groups
     * @param groupIds ids of groups to delete
     */
    deleteMultiple(groupIds: number[]): Observable<any> {
        return this.http.request('delete', this.config.userAndGroupRestBasePath + this.groupsPathExtension, {
            body: groupIds,
        });
    }

    /**
     * Sends http request to delete group
     * @param groupId id of a group to delete
     */
    delete(groupId: number): Observable<any> {
        return this.http.delete(`${this.config.userAndGroupRestBasePath + this.groupsPathExtension}${groupId}`);
    }

    /**
     * Sends http request to assign role to group
     * @param groupId id of a group to be associated with a role
     * @param roleId id of a role to be assigned to a group
     */
    assignRole(groupId: number, roleId: number): Observable<any> {
        return this.http.put(
            `${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}/${groupId}/${this.rolesPathExtension}/${roleId}`,
            {},
        );
    }

    /**
     * Sends http request to remove role from group
     * @param groupId id of group which associated with a role should be cancelled
     * @param roleId id of a role to be removed from group
     */
    removeRole(groupId: number, roleId: number): Observable<any> {
        return this.http.delete(
            `${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}/${groupId}/${this.rolesPathExtension}/${roleId}`,
        );
    }

    /**
     * Sends http request to get all roles of a group
     * @param groupId id of a group associated with roles
     * @param pagination requested pagination
     * @param filter filter to be applied on result
     */
    getRolesOfGroup(
        groupId: number,
        pagination: OffsetPaginationEvent,
        filter: SentinelFilter[] = [],
    ): Observable<PaginatedResource<UserRole>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filter),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<RoleDTO>
            >(`${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}/${groupId}/${this.rolesPathExtension}`, { params })
            .pipe(map((roleDTOs) => RoleMapper.mapPaginatedRolesDTOtoRoles(roleDTOs)));
    }

    /**
     * Sends http request to remove users from a group
     * @param groupId id of a group associated with users
     * @param userIds ids of users to be removed from a group
     */
    removeUsersFromGroup(groupId: number, userIds: number[]): Observable<any> {
        return this.http.request(
            'delete',
            `${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}/${groupId}/${this.usersPathExtension}`,
            { body: userIds },
        );
    }

    /**
     * Sends http request to add users to a group
     * @param groupId id of a group to be associated with users
     * @param userIds ids of users to be added to the group
     * @param groupIds ids of a groups from where users should be imported
     */
    addUsersToGroup(groupId: number, userIds: number[], groupIds: number[] = []): Observable<any> {
        return this.http.put(
            `${this.config.userAndGroupRestBasePath}${this.groupsPathExtension}/${groupId}/${this.usersPathExtension}`,
            GroupMapper.createAddUsersToGroupDTO(userIds, groupIds),
        );
    }
}
