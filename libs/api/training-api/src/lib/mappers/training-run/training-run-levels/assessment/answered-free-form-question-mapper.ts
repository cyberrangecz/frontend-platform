import { FreeFormQuestion } from '@crczp/training-model';
import { AnsweredFreeFormQuestionDTOClass } from '../../../../dto/training-run/training-run-levels/answered-free-form-question-dto';

export class AnsweredFreeFormQuestionMapper {
    static fromDTO(dto: AnsweredFreeFormQuestionDTOClass): FreeFormQuestion {
        const result = new FreeFormQuestion(dto.text);
        result.choices = dto.choices ? dto.choices : [];
        result.userAnswers = dto.user_answers ? dto.user_answers : [];
        return result;
    }
}
