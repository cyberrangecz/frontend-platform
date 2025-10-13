import {PaginatedResource} from '@sentinel/common/pagination';
import {Group} from '@crczp/user-and-group-model';
import {GroupDTO} from '../DTO/group/group-dto.model';
import {CreateGroupDTO} from '../DTO/group/new-group-dto.model';
import {UpdateGroupDTO} from '../DTO/group/update-group-dto.model';
import {AddUsersToGroupDTO} from '../DTO/user/add-user-to-group-dto.model';
import {RoleMapper} from './role-mapper';
import {UserMapper} from './user.mapper';
import {JavaPaginatedResource, PaginationMapper} from '@crczp/api-common';

/**
 * Maps internal model to group DTOs and other way
 * @dynamic
 */
export class GroupMapper {
    /**
     * Maps paginated group dto to internal model
     * @param restResource paginated group dto
     */
    static mapPaginatedGroupDTOsToGroups(restResource: JavaPaginatedResource<GroupDTO>): PaginatedResource<Group> {
        return new PaginatedResource<Group>(
            restResource.content.map((groupDTO) => this.mapGroupDTOToGroup(groupDTO)),
            PaginationMapper.fromJavaDTO(restResource.pagination),
        );
    }

    /**
     * Maps group dto to internal model
     * @param groupDTO group dto to be mapped
     */
    static mapGroupDTOToGroup(groupDTO: GroupDTO): Group {
        const result = new Group();
        result.id = groupDTO.id;
        result.name = groupDTO.name;
        result.description = groupDTO.description;
        result.canBeDeleted = groupDTO.can_be_deleted;
        result.members = UserMapper.mapUserForGroupsDTOsToUsers(groupDTO.users);
        result.roles = RoleMapper.mapRoleDTOsToRoles(groupDTO.roles);
        if (groupDTO.expiration_date) {
            result.expirationDate = new Date(groupDTO.expiration_date);
        }
        return result;
    }

    /**
     * Maps internal model to new group dto
     * @param group group to be mapped
     * @param groupsToImportFromId ids of groups for import of users
     */
    static mapGroupToCreateGroupDTO(group: Group, groupsToImportFromId: number[]): CreateGroupDTO {
        const result = new CreateGroupDTO();
        result.name = group.name;
        result.description = group.description;
        result.group_ids_of_imported_users = groupsToImportFromId;
        result.users = UserMapper.mapUsersToUserForGroupDTOs(group.members);
        if (group.expirationDate) {
            result.expiration_date = group.getExpirationDateUTC().toISOString();
        }
        return result;
    }

    /**
     * Maps internal model to update group dto
     * @param group group to be mapped
     */
    static mapGroupToUpdateGroupDTO(group: Group): UpdateGroupDTO {
        const result = new UpdateGroupDTO();
        result.id = group.id;
        result.name = group.name;
        result.description = group.description;
        if (group.expirationDate) {
            result.expiration_date = group.getExpirationDateUTC().toISOString();
        }
        return result;
    }

    /**
     * Creates add users to group dto
     * @param userIds ids of users to add
     * @param groupIds ids of groups to import
     */
    static createAddUsersToGroupDTO(userIds: number[], groupIds: number[]): AddUsersToGroupDTO {
        const result = new AddUsersToGroupDTO();
        result.ids_of_users_to_be_add = userIds;
        result.ids_of_groups_of_imported_users = groupIds;
        return result;
    }
}
