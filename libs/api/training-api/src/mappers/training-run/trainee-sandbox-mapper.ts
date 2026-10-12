import { SandboxStageState, TraineeSandbox } from '@crczp/training-model';
import { TraineeSandboxDTO } from '../../dto/training-run/trainee-sandbox-dto';

export class TraineeSandboxMapper {
    static fromDTO(dto: TraineeSandboxDTO): TraineeSandbox {
        const result = new TraineeSandbox();
        result.id = dto.id;
        result.poolId = dto.pool_id;
        result.sandboxId = dto.sandbox_id ?? undefined;
        result.createdAt = dto.created_at
            ? new Date(dto.created_at)
            : undefined;
        result.allocationStages = (dto.allocation_request?.stages ??
            []) as SandboxStageState[];
        result.cleanupStages = dto.cleanup_request
            ? (dto.cleanup_request.stages as SandboxStageState[])
            : undefined;
        result.removable = dto.allow_remove;
        result.trainingInstanceId = dto.training_instance_id ?? undefined;
        result.trainingInstanceTitle = dto.training_instance_title ?? undefined;
        return result;
    }

    static fromDTOs(dtos: TraineeSandboxDTO[]): TraineeSandbox[] {
        return (dtos ?? []).map((dto) => TraineeSandboxMapper.fromDTO(dto));
    }
}
