import { SandboxDefinitionRef } from '@crczp/sandbox-model';
import { SandboxDefinitionRefDTO } from '../../dto/sandbox-definition/sandbox-definition-ref-dto';

export class SandboxDefinitionRefMapper {
    static fromDTO(dto: SandboxDefinitionRefDTO): SandboxDefinitionRefDTO {
        const ref = new SandboxDefinitionRef();
        ref.name = dto.name;
        return ref;
    }

    static fromDTOs(dtos: SandboxDefinitionRefDTO[]): SandboxDefinitionRefDTO[] {
        const result = dtos.map((dto) => SandboxDefinitionRefMapper.fromDTO(dto));
        return result;
    }
}
