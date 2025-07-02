import {SandboxDefinition} from '@crczp/sandbox-model';
import {SandboxDefinitionDTO} from '../../dto/sandbox-definition/sandbox-definition-dto';
import {CreatedByMapper} from '../sandbox-instance/created-by-mapper';

export class SandboxDefinitionMapper {
    static fromDTO(dto: SandboxDefinitionDTO): SandboxDefinition {
        const sandbox = new SandboxDefinition();
        sandbox.id = dto.id;
        sandbox.title = dto.name;
        sandbox.url = dto.url;
        sandbox.rev = dto.rev;
        sandbox.createdBy = CreatedByMapper.fromDTO(dto.created_by);
        return sandbox;
    }

    static fromDTOs(dtos: SandboxDefinitionDTO[]): SandboxDefinition[] {
        const result = dtos.map((dto) => SandboxDefinitionMapper.fromDTO(dto));
        return result;
    }
}
