import { UserRole } from '@crczp/user-and-group-model';
import { RoleDTO } from '../DTO/role/role-dto';
import { JavaPaginatedResource, OffsetPaginatedResource, PaginationMapper } from '@crczp/api-common';

/**
 * @dynamic
 */
export class RoleMapper {
    /**
     * Maps roles DTOs to internal model
     * @param resource roles dto
     */
    static mapPaginatedRolesDTOtoRoles(
        resource: JavaPaginatedResource<RoleDTO>,
    ): OffsetPaginatedResource<UserRole> {
        const content = this.mapRoleDTOsToRoles(resource.content);
        const pagination = PaginationMapper.fromJavaDTO(resource.pagination);
        return new OffsetPaginatedResource(content, pagination);
    }

    static mapRoleDTOsToRoles(roleDtos: RoleDTO[]): UserRole[] {
        if (roleDtos) {
            return roleDtos.map((roleDto) => this.mapRoleDTOToRole(roleDto));
        } else {
            return [];
        }
    }

    static mapRoleDTOToRole(dto: RoleDTO): UserRole {
        const role = new UserRole();
        role.id = dto.id;
        role.microserviceId = dto.id_of_microservice;
        role.microserviceName = dto.name_of_microservice;
        role.roleType = dto.role_type;
        role.description = dto.description ? dto.description : '';
        return role;
    }
}
