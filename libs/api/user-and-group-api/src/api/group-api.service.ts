import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SentinelParamsMerger } from '@sentinel/common';
import { JavaPaginatedResource, OffsetPaginatedResource, ParamsBuilder, QueryParam } from '@crczp/api-common';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Group, UserRole } from '@crczp/user-and-group-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { GroupDTO } from '../DTO/group/group-dto.model';
import { RoleDTO } from '../DTO/role/role-dto';
import { GroupMapper } from '../mappers/group.mapper';
import { RoleMapper } from '../mappers/role-mapper';
import { PortalConfig } from '@crczp/utils';
import { GroupSort, RoleSort } from './sort';

/**
 * Default implementation of service abstracting http communication with group endpoints.
 */
@Injectable()
export class GroupApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = inject(PortalConfig).basePaths.userAndGroup;
    private readonly groupsPathExtension = 'groups';
    private readonly usersPathExtension = 'users';
    private readonly rolesPathExtension = 'roles';

    /**
     * Sends http request to get paginated groups
     * @param pagination requested pagination
     * @param filter filter to be applied on groups
     */
    getAll(
        pagination: OffsetPaginationEvent<GroupSort>,
        filter: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<Group>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filter),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<GroupDTO>
            >(`${this.apiUrl}/${this.groupsPathExtension}`, { params })
            .pipe(
                map((resp) => GroupMapper.mapPaginatedGroupDTOsToGroups(resp)),
            );
    }

    /**
     * Sends http request to get group by id
     * @param groupId id of requested group
     */
    get(groupId: number): Observable<Group> {
        return this.http
            .get<GroupDTO>(
                `${this.apiUrl}/${this.groupsPathExtension}/${groupId}`,
            )
            .pipe(map((groupDTO) => GroupMapper.mapGroupDTOToGroup(groupDTO)));
    }

    /**
     * Sends http request to create new group
     * @param group group to create
     * @param groupsToImportFromId ids of groups to import users from
     */
    create(
        group: Group,
        groupsToImportFromId: number[] = [],
    ): Observable<number> {
        return this.http
            .post<GroupDTO>(
                `${this.apiUrl}/${this.groupsPathExtension}`,
                GroupMapper.mapGroupToCreateGroupDTO(
                    group,
                    groupsToImportFromId,
                ),
            )
            .pipe(map((groupDTO) => groupDTO.id));
    }

    /**
     * Sends http request to update existing group
     * @param group group to update
     */
    update(group: Group): Observable<any> {
        return this.http.put(
            `${this.apiUrl}/${this.groupsPathExtension}`,
            GroupMapper.mapGroupToUpdateGroupDTO(group),
        );
    }

    /**
     * Sends http request to delete multiple groups
     * @param groupIds ids of groups to delete
     */
    deleteMultiple(groupIds: number[]): Observable<any> {
        return this.http.request(
            'delete',
            `${this.apiUrl}/${this.groupsPathExtension}`,
            {
                body: groupIds,
            },
        );
    }

    /**
     * Sends http request to delete group
     * @param groupId id of a group to delete
     */
    delete(groupId: number): Observable<any> {
        return this.http.delete(
            `${this.apiUrl}/${this.groupsPathExtension}/${groupId}`,
        );
    }

    /**
     * Sends http request to assign role to group
     * @param groupId id of a group to be associated with a role
     * @param roleId id of a role to be assigned to a group
     */
    assignRole(groupId: number, roleId: number): Observable<any> {
        return this.http.put(
            `${this.apiUrl}/${this.groupsPathExtension}/${groupId}/${this.rolesPathExtension}/${roleId}`,
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
            `${this.apiUrl}/${this.groupsPathExtension}/${groupId}/${this.rolesPathExtension}/${roleId}`,
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
        pagination: OffsetPaginationEvent<RoleSort>,
        filter: QueryParam[] = [],
    ): Observable<OffsetPaginatedResource<UserRole>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filter),
        ]);
        return this.http
            .get<
                JavaPaginatedResource<RoleDTO>
            >(`${this.apiUrl}/${this.groupsPathExtension}/${groupId}/${this.rolesPathExtension}`, { params })
            .pipe(
                map((roleDTOs) =>
                    RoleMapper.mapPaginatedRolesDTOtoRoles(roleDTOs),
                ),
            );
    }

    /**
     * Sends http request to remove users from a group
     * @param groupId id of a group associated with users
     * @param userIds ids of users to be removed from a group
     */
    removeUsersFromGroup(groupId: number, userIds: number[]): Observable<any> {
        return this.http.request(
            'delete',
            `${this.apiUrl}/${this.groupsPathExtension}/${groupId}/${this.usersPathExtension}`,
            { body: userIds },
        );
    }

    /**
     * Sends http request to add users to a group
     * @param groupId id of a group to be associated with users
     * @param userIds ids of users to be added to the group
     * @param groupIds ids of a groups from where users should be imported
     */
    addUsersToGroup(
        groupId: number,
        userIds: number[],
        groupIds: number[] = [],
    ): Observable<any> {
        return this.http.put(
            `${this.apiUrl}/${this.groupsPathExtension}/${groupId}/${this.usersPathExtension}`,
            GroupMapper.createAddUsersToGroupDTO(userIds, groupIds),
        );
    }
}
