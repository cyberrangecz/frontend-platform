import { PaginatedResource } from '@sentinel/common/pagination';
import { User } from '@crczp/user-and-group-model';
import { UserAndGroupUserDTO } from '../DTO/user/user-dto.model';
import { UserForGroupsDTO } from '../DTO/user/user-for-groups-dto.model';
import { RoleMapper } from './role-mapper';
import { JavaPaginatedResource, PaginationMapper } from '@crczp/api-common';

/**
 * Service to map internal model to dtos and other way
 */
export class UserMapper {
    /**
     * Maps user dtos to internal model
     * @param restResource user dtos
     */
    static mapUserDTOsToUsers(restResource: JavaPaginatedResource<UserAndGroupUserDTO>): PaginatedResource<User> {
        const result = new PaginatedResource<User>(
            restResource.content.map((userDTO) => this.mapUserDTOToUser(userDTO)),
            PaginationMapper.fromJavaDTO(restResource.pagination),
        );
        return result;
    }

    /**
     * Maps user dtos fro groups to internal model
     * @param userForGroupsDTOs user dtos
     */
    static mapUserForGroupsDTOsToUsers(userForGroupsDTOs: UserForGroupsDTO[]): User[] {
        if (userForGroupsDTOs) {
            return userForGroupsDTOs.map((userDTO) => this.mapUserForGroupsDTOToUser(userDTO));
        } else {
            return [];
        }
    }

    /**
     * Maps user fro group dto to iternal model
     * @param userForGroupDTO user dto
     */
    static mapUserForGroupsDTOToUser(userForGroupDTO: UserForGroupsDTO): User {
        const result = new User();
        result.id = userForGroupDTO.id;
        result.name = `${userForGroupDTO.given_name} ${userForGroupDTO.family_name}`;
        result.issuer = userForGroupDTO.iss;
        result.nameWithAcademicTitles = userForGroupDTO.full_name;
        result.mail = userForGroupDTO.mail;
        result.login = userForGroupDTO.login;
        return result;
    }

    /**
     * Maps user dto to user
     * @param dto user dto
     */
    static mapUserDTOToUser(dto: UserAndGroupUserDTO): User {
        const user = new User();
        if (dto.roles) {
            user.roles = RoleMapper.mapRoleDTOsToRoles(dto.roles);
        }
        if (dto.id !== null && dto.id !== undefined) {
            user.id = dto.id;
        }
        if (dto.user_ref_id !== null && dto.user_ref_id !== undefined) {
            user.id = dto.user_ref_id;
        }
        if (dto.mail !== null && dto.mail !== undefined) {
            user.mail = dto.mail;
        }
        user.login = dto.sub;
        user.picture = dto.picture;
        user.issuer = dto.iss;
        user.name = `${dto.given_name} ${dto.family_name}`;
        user.nameWithAcademicTitles = dto.full_name;
        return user;
    }

    /**
     * Maps users to user for groups dtos
     * @param users internal model users
     */
    static mapUsersToUserForGroupDTOs(users: User[]): UserForGroupsDTO[] {
        if (users) {
            return users.map((user) => this.mapUserToUserForGroupDTO(user));
        } else {
            return [];
        }
    }

    /**
     * Maps user to  user for group dto
     * @param user internal model users
     */
    static mapUserToUserForGroupDTO(user: User): UserForGroupsDTO {
        const result = new UserForGroupsDTO();
        result.full_name = user.nameWithAcademicTitles;
        result.id = user.id;
        result.login = user.login;
        result.iss = user.issuer;
        result.mail = user.mail;
        return result;
    }
}
