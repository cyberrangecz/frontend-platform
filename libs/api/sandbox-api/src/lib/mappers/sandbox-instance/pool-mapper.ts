import { Pool } from '@crczp/sandbox-model';
import { PoolCreateDTO } from '../../dto/sandbox-instance/pool-create-dto';
import { PoolDTO } from '../../dto/sandbox-instance/pool-dto';
import { CreatedByMapper } from './created-by-mapper';
import { HardwareUsageMapper } from './hardware-usage-mapper';
import { SandboxDefinitionMapper } from '../sandbox-definition/sandbox-definition-mapper';
import { PoolUpdateDTO } from '../../dto/sandbox-instance/pool-update-dto';

/**
 * @dynamic
 */
export class PoolMapper {
    static fromDTO(dto: PoolDTO): Pool {
        const pool = new Pool();
        pool.id = dto.id;
        pool.definition = SandboxDefinitionMapper.fromDTO(dto.definition);
        pool.lockId = dto.lock_id;
        pool.usedSize = dto.size;
        pool.maxSize = dto.max_size;
        pool.hardwareUsage = HardwareUsageMapper.fromDTO(dto.hardware_usage);
        pool.createdBy = CreatedByMapper.fromDTO(dto.created_by);
        pool.comment = dto.comment;
        pool.visible = dto.visible;
        pool.notifyBuild = dto.send_emails;
        return pool;
    }

    static fromDTOs(dtos: PoolDTO[]): Pool[] {
        return dtos.map((dto) => PoolMapper.fromDTO(dto));
    }

    static toCreateDTO(pool: Pool): PoolCreateDTO {
        const dto = new PoolCreateDTO();
        dto.definition_id = pool.definition.id;
        dto.max_size = pool.maxSize;
        dto.comment = pool.comment;
        dto.visible = pool.visible;
        dto.send_emails = pool.notifyBuild;
        return dto;
    }

    static toUpdateDTO(pool: Pool) {
        const dto = new PoolUpdateDTO();
        dto.comment = pool.comment;
        dto.visible = pool.visible;
        dto.max_size = pool.maxSize;
        dto.send_emails = pool.notifyBuild;
        return dto;
    }
}
