import {LevelAnswersStatistics} from '@crczp/visualization-model';
import {LevelAnswersStatisticsDTO} from '../dtos';

export class LevelAnswersMapper {
    static fromDTOs(dtos: LevelAnswersStatisticsDTO[]): LevelAnswersStatistics[] {
        return dtos.map((dto) => LevelAnswersMapper.fromDTO(dto));
    }

    static fromDTO(dto: LevelAnswersStatisticsDTO): LevelAnswersStatistics {
        const answers = new LevelAnswersStatistics();
        answers.id = dto.level_id;
        answers.correctAnswerSubmitted = dto.correct_answers_submitted;
        answers.wrongAnswers = dto.wrong_answers;
        answers.correctAnswer = dto.correct_answer;
        return answers;
    }
}
