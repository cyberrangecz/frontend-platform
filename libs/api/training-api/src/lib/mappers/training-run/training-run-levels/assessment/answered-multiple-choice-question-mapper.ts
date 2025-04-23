import { MultipleChoiceQuestion } from '@crczp/training-model';
import { AnsweredMultipleChoiceQuestionDTOClass } from '../../../../dto/training-run/training-run-levels/answered-multiple-choice-question-dto';

export class AnsweredMultipleChoiceQuestionMapper {
    static fromDTO(dto: AnsweredMultipleChoiceQuestionDTOClass): MultipleChoiceQuestion {
        const result = new MultipleChoiceQuestion(dto.text);
        result.choices = dto.choices;
        result.choices.sort((a, b) => a.order - b.order);
        result.userAnswers = dto.user_answers ? dto.user_answers : [];
        return result;
    }
}
