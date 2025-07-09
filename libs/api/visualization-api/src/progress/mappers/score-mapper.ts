import {ProgressEventDTO} from '../dtos';
import {ProgressEventType} from '@crczp/visualization-model';

export class ScoreMapper {
    static fromDTOs(dtos: ProgressEventDTO[]): number {
        const result = dtos.find((dto) => dto.type === ProgressEventType.LevelCompleted)?.actual_score_in_level;
        return result ? result : 0;
    }
}
