import { AbstractQuestionDTO } from '../../../dto/level/assessment/abstact-question-dto';
import {
    FreeFormQuestionCreateDTO,
    FreeFormQuestionDTOClass,
} from '../../../dto/level/assessment/free-form-question-dto';
import { QuestionAnswerDTO } from '../../../dto/level/assessment/question-answer-dto';
import { FreeFormQuestion } from '@crczp/training-model';

export class FreeFormQuestionMapper {
    static fromDTO(dto: FreeFormQuestionDTOClass): FreeFormQuestion {
        const result = new FreeFormQuestion(dto.text);
        result.choices = dto.choices ? dto.choices : [];
        return result;
    }

    static toAnswersDTO(question: FreeFormQuestion): QuestionAnswerDTO {
        const result = new QuestionAnswerDTO();
        result.question_id = question.id;
        result.answers = question.userAnswers ? question.userAnswers : [];
        return result;
    }

    static toCreateDTO(question: FreeFormQuestion): FreeFormQuestionCreateDTO {
        const result = new FreeFormQuestionDTOClass();
        result.question_type = AbstractQuestionDTO.QuestionTypeEnum.FFQ;
        result.choices = question.choices;
        return result;
    }
}
