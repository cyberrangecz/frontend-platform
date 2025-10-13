import {QuestionAnswer} from '@crczp/training-model';
import {QuestionAnswerDTO} from '../../dto/phase/questionnaire-phase/question-answer-dto';

/**
 * @dynamic
 */
export class QuestionAnswerMapper {
    static toDTO(questionAnswer: QuestionAnswer): QuestionAnswerDTO {
        const dto = new QuestionAnswerDTO();
        dto.question_id = questionAnswer.questionId;
        dto.answers = questionAnswer.answers;
        return dto;
    }

    static toDTOs(questionAnswers: QuestionAnswer[]): QuestionAnswerDTO[] {
        return questionAnswers.map((questionAnswer) => this.toDTO(questionAnswer));
    }
}
