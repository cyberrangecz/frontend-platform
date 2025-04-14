import { SandboxAllocationUnit } from '@crczp/sandbox-model';
import { SandboxAllocationUnitDTO } from '../../DTOs/sandbox-instance/sandbox-allocation-unit-dto';
import { CreatedByMapper } from './created-by-mapper';
import { RequestMapper } from './request-mapper';

/**
 * @dynamic
 */
export class SandboxAllocationUnitMapper {
    static fromDTOs(dtos: SandboxAllocationUnitDTO[]): SandboxAllocationUnit[] {
        if (!dtos) return [];
        return dtos.map((dto) => SandboxAllocationUnitMapper.fromDTO(dto));
    }

    static fromDTO(dto: SandboxAllocationUnitDTO): SandboxAllocationUnit {
        const result = new SandboxAllocationUnit();
        result.id = dto.id;
        result.poolId = dto.pool_id;
        result.locked = dto.locked;
        result.comment = dto.comment;
        result.allocationRequest = RequestMapper.fromAllocationDTO(dto.allocation_request);
        result.cleanupRequest = RequestMapper.fromCleanupDTO(dto.cleanup_request);
        result.createdBy = CreatedByMapper.fromDTO(dto.created_by);
        return result;
    }

    static toUpdateDTO(allocationUnit: SandboxAllocationUnit) {
        const dto = new SandboxAllocationUnit();
        dto.comment = allocationUnit.comment;
        return dto;
    }
}
