import {FfqQuestionDTO} from '../../dto/timeline/ffq-question-dto';
import {FfqQuestion} from '../../../model/timeline/ffq-question';

export class FfqQuestionMapper {
    static fromDTO(dto: FfqQuestionDTO): FfqQuestion {
        const question = new FfqQuestion();
        question.correctAnswers = dto.correct_answers;
        question.playerAnswer = dto.player_answer;

        return question;
    }
}
