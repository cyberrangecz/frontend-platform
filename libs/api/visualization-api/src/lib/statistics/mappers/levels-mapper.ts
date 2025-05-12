import { LevelStatistics } from '@crczp/visualization-model';
import { LevelStatisticsDto } from '../dtos';


export class LevelsMapper {
    static fromDTOs(dtos: LevelStatisticsDto[]): LevelStatistics[] {
        return dtos.map((dto) => LevelsMapper.fromDTO(dto));
    }

    static fromDTO(dto: LevelStatisticsDto): LevelStatistics {
        const level = new LevelStatistics();
        level.id = dto.level_id;
        level.title = dto.level_title;
        level.score = dto.score;
        level.duration = dto.duration;
        level.hintsTaken = dto.hints_taken;
        level.wrongAnswerSubmitted = dto.wrong_answers;
        return level;
    }
}
