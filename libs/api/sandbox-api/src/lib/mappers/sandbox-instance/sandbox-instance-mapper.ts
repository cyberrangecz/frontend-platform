import { SandboxInstance } from '@crczp/sandbox-model';
import { SandboxInstanceDTO } from '../../dto/sandbox-instance/sandbox-instance-dto';

/**
 * @dynamic
 */
export class SandboxInstanceMapper {
    static fromDTO(dto: SandboxInstanceDTO): SandboxInstance {
        const result = new SandboxInstance();
        result.id = dto.id;
        result.allocationUnitId = dto.allocation_unit_id;
        result.lockId = dto.lock_id;
        return result;
    }

    static fromDTOs(dtos: SandboxInstanceDTO[]): SandboxInstance[] {
        return dtos.map((dto) => SandboxInstanceMapper.fromDTO(dto));
    }
}
