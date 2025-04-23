import { MultipleChoiceQuestion } from '@crczp/training-model';
import { AbstractQuestionDTO } from '../../../dto/level/assessment/abstact-question-dto';
import {
    MultipleChoiceQuestionCreateDTO,
    MultipleChoiceQuestionCreateDTOClass,
} from '../../../dto/level/assessment/multiple-choice-question-create-dto';
import { QuestionAnswerDTO } from '../../../dto/level/assessment/question-answer-dto';

export class MultipleChoiceQuestionMapper {
    static fromDTO(dto: MultipleChoiceQuestionCreateDTOClass): MultipleChoiceQuestion {
        const result = new MultipleChoiceQuestion(dto.text);
        result.choices = dto.choices;
        result.choices.sort((a, b) => a.order - b.order);
        return result;
    }

    static toAnswersDTO(question: MultipleChoiceQuestion): QuestionAnswerDTO {
        const result = new QuestionAnswerDTO();
        result.question_id = question.id;
        result.answers = question.userAnswers;
        return result;
    }

    static toCreateDTO(question: MultipleChoiceQuestion): MultipleChoiceQuestionCreateDTO {
        const questionDTO = new MultipleChoiceQuestionCreateDTOClass();
        questionDTO.question_type = AbstractQuestionDTO.QuestionTypeEnum.MCQ;
        questionDTO.choices = question.choices;
        return questionDTO;
    }
}
