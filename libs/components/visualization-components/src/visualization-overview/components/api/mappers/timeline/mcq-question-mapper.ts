import {McqQuestionDTO} from '../../dto/timeline/mcq-question-dto';
import {McqQuestion} from '../../../model/timeline/mcq-question';

export class McqQuestionMapper {
    static fromDTO(dto: McqQuestionDTO): McqQuestion {
        const question = new McqQuestion();
        question.options = dto.options;
        question.correctAnswers = dto.correct_answers;
        question.playerAnswers = dto.player_answers;

        return question;
    }
}
