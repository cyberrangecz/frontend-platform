import { QuotasMapper } from './quotas-mapper';
import { SandboxResourcesDTO } from '../../dto/sandbox-resources/sandbox-resources-dto';
import { Resources } from '@crczp/sandbox-model';

/**
 * @dynamic
 */
export class ResourcesMapper {
    static fromDTO(dto: SandboxResourcesDTO): Resources {
        const resources = new Resources();
        resources.projectName = dto.project_name;
        resources.quotas = QuotasMapper.fromDTO(dto.quotas);
        return resources;
    }
}
