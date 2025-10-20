import { Microservice, MicroserviceRole } from '@crczp/user-and-group-model';
import { MicroserviceCreateDTO } from '../DTO/microservice/microservice-create-dto.model';
import { MicroserviceDTO } from '../DTO/microservice/microservice-dto';
import { MicroserviceRoleDTO } from '../DTO/microservice/microservice-role-dto';
import { JavaPaginatedResource, OffsetPaginatedResource, PaginationMapper } from '@crczp/api-common';

/**
 * Class mapping internal model to DTOs and other way
 * @dynamic
 */
export class MicroserviceMapper {
    /**
     * Maps microservice internal model to microservice dto
     * @param microservice internal model to be mapped to dto
     */
    static mapMicroserviceToMicroserviceCreateDTO(
        microservice: Microservice,
    ): MicroserviceCreateDTO {
        const result = new MicroserviceCreateDTO();
        result.endpoint = microservice.endpoint;
        result.name = microservice.name;
        result.roles = this.mapMicroserviceRolesToMicroserviceRolesDTO(
            microservice.roles,
        );
        return result;
    }

    /**
     * Maps microservice dto to internal model
     * @param restResource
     */
    static mapMicroserviceDTOsToMicroservices(
        restResource: JavaPaginatedResource<MicroserviceDTO>,
    ): OffsetPaginatedResource<Microservice> {
        return new OffsetPaginatedResource<Microservice>(
            restResource.content.map((microserviceDTO) =>
                this.mapMicroserviceDTOToMicroservice(microserviceDTO),
            ),
            PaginationMapper.fromJavaDTO(restResource.pagination),
        );
    }

    /**
     * Maps microservice dto to microservice
     * @param microserviceDTO microservice dto
     */
    static mapMicroserviceDTOToMicroservice(
        microserviceDTO: MicroserviceDTO,
    ): Microservice {
        const result = new Microservice(
            microserviceDTO.name,
            microserviceDTO.endpoint,
            [],
        );
        result.id = microserviceDTO.id;
        return result;
    }

    private static mapMicroserviceRolesToMicroserviceRolesDTO(
        roles: MicroserviceRole[],
    ): MicroserviceRoleDTO[] {
        return roles.map((role) => {
            const dto = new MicroserviceRoleDTO();
            dto.default = role.default;
            dto.description = role.description;
            dto.role_type = role.type;
            return dto;
        });
    }
}
