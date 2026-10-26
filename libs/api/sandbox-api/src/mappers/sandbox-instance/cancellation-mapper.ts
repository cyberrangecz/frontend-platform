import { StopPendingResult, UnitCancellation } from '@crczp/sandbox-model';
import {
    PoolCancelAllocationsResultDTO,
    StopPendingResultDTO,
    UnitCancellationDTO,
} from '../../dto/sandbox-instance/cancellation-dto';

/**
 * @dynamic
 */
export class CancellationMapper {
    static stopPendingFromDTO(dto: StopPendingResultDTO): StopPendingResult {
        const result = new StopPendingResult();
        result.stopPending = dto.stop_pending;
        return result;
    }

    static unitsFromDTO(dto: PoolCancelAllocationsResultDTO): UnitCancellation[] {
        return dto.units.map((unitDto) => CancellationMapper.unitFromDTO(unitDto));
    }

    private static unitFromDTO(dto: UnitCancellationDTO): UnitCancellation {
        const unit = new UnitCancellation();
        unit.unitId = dto.unit_id;
        unit.stackName = dto.stack_name;
        unit.action = dto.action;
        unit.stopPending = dto.stop_pending;
        unit.reason = dto.reason;
        return unit;
    }
}
