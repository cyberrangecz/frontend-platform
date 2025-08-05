import { RequestStageState } from '@crczp/sandbox-model';

/**
 * @dynamic
 */
export class StageMapper {
    static fromDTOs(dtos: string[]): RequestStageState[] {
        return dtos.map((dto) => StageMapper.fromDTO(dto));
    }

    static fromDTO(dto: string): RequestStageState {
        const result = StageMapper.stageResolver(dto);
        return result;
    }

    private static stageResolver(stage: string): RequestStageState {
        switch (stage) {
            case 'IN_QUEUE':
                return RequestStageState.IN_QUEUE;
            case 'RUNNING':
                return RequestStageState.RUNNING;
            case 'FAILED':
                return RequestStageState.FAILED;
            case 'FINISHED':
                return RequestStageState.FINISHED;
        }
    }
}
