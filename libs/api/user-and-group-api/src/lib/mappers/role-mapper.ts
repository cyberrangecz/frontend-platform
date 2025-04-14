import { PaginatedResource } from '@sentinel/common/pagination';
import { UserRole } from '@crczp/user-and-group-model';
import { RestResourceDTO } from '../DTO/rest-resource-dto.model';
import { RoleDTO } from '../DTO/role/role-dto';
import { PaginationMapper } from './pagination-mapper';

/**
 * @dynamic
 */
export class RoleMapper {
    /**
     * Maps roles DTOs to internal model
     * @param resource roles dto
     */
    static mapPaginatedRolesDTOtoRoles(resource: RestResourceDTO<RoleDTO>): PaginatedResource<UserRole> {
        const content = this.mapRoleDTOsToRoles(resource.content);
        const pagination = PaginationMapper.mapDTOToPagination(resource.pagination);
        return new PaginatedResource(content, pagination);
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
