import {TrainingLevelDto} from '../../dto/timeline/training-level-dto';
import {TrainingLevel} from '../../../model/timeline/training-level';

export class TrainingLevelMapper {
    static fromDTO(dto: TrainingLevelDto): TrainingLevel {
        const level = new TrainingLevel();
        level.score = dto.score;
        level.solutionDisplayedTime = dto.solution_displayed_time / 1000;
        level.correctAnswerTime = dto.correct_answer_time / 1000;
        return level;
    }
}
