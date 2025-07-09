import {EmiQuestionDTO} from '../../dto/timeline/emi-question-dto';
import {EmiQuestion} from '../../../model/timeline/emi-question';

export class EmiQuestionMapper {
    static fromDTO(dto: EmiQuestionDTO): EmiQuestion {
        const question = new EmiQuestion();
        question.row = dto.row;
        question.column = dto.column;
        question.correctAnswers = dto.correct_answers;
        question.playerAnswers = dto.player_answers;

        return question;
    }
}
