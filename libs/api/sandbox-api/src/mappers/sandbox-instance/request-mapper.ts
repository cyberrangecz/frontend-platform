import { AllocationRequest, CleanupRequest, Request, RequestStageState } from '@crczp/sandbox-model';
import { RequestDTO } from '../../dto/sandbox-instance/request-dto';

/**
 * @dynamic
 */
export class RequestMapper {
    static fromAllocationDTOs(dtos: RequestDTO[]): AllocationRequest[] {
        if (!dtos) return [];
        return dtos.map((dto) => RequestMapper.fromAllocationDTO(dto));
    }

    static fromAllocationDTO(dto: RequestDTO): AllocationRequest {
        const request = new AllocationRequest();
        if (!dto) this.setBlankAllocationAttributes(request);
        else this.setGeneralAttributes(request, dto);
        return request;
    }

    static fromCleanupDTOs(dtos: RequestDTO[]): CleanupRequest[] {
        return dtos.map((dto) => RequestMapper.fromCleanupDTO(dto));
    }

    static fromCleanupDTO(dto: RequestDTO): CleanupRequest {
        if (!dto) return null;
        const request = new CleanupRequest();
        this.setGeneralAttributes(request, dto);
        return request;
    }

    private static setGeneralAttributes(request: Request, dto: RequestDTO) {
        request.id = dto.id;
        request.allocationUnitId = dto.allocation_unit_id;
        request.createdAt = new Date(dto.created);
        request.stages = this.stagesResolver(dto.stages);
    }

    private static setBlankAllocationAttributes(request: Request) {
        request.stages = this.stagesResolver([RequestStageState.QUEUED]);
    }

    private static stagesResolver(stages: string[]) {
        return stages.map((stage) => this.stageResolver(stage));
    }

    private static stageResolver(stage: string) {
        if (!stage || typeof stage !== 'string') {
            return RequestStageState.QUEUED;
        }
        const s = stage.trim();
        switch (s) {
            case 'RUNNING':
            case 'Running':
                return RequestStageState.RUNNING;
            case 'FAILED':
            case 'Failed':
                return RequestStageState.FAILED;
            case 'FINISHED':
            case 'Finished':
                return RequestStageState.FINISHED;
            case 'IN_QUEUE':
            case 'In Queue':
            case 'QUEUED':
                return RequestStageState.QUEUED;
            case 'Retry':
                return RequestStageState.RETRY;
            default:
                throw new Error(`Unknown stage ${stage}`);
        }
    }
}
