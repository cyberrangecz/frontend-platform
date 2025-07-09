import {AssessmentQuestion} from '@crczp/visualization-model';
import {EmiAnswerMapper} from './emi-answer-mapper';
import {AnswerMapper} from './answer-mapper';
import {EmiAnswerDTO, QuestionDTO} from '../dtos';


export class QuestionMapper {
    static fromDTOs(dtos: QuestionDTO[]): AssessmentQuestion[] {
        return dtos.map((dto) => QuestionMapper.fromDTO(dto));
    }

    static fromDTO(dto: QuestionDTO): AssessmentQuestion {
        const question = new AssessmentQuestion();
        question.id = dto.id;
        question.order = dto.order;
        question.text = dto.text;
        question.questionType = dto.question_type;
        if (dto.question_type === 'EMI') {
            question.answers = EmiAnswerMapper.fromDTOs(dto.answers as EmiAnswerDTO[]);
        } else {
            question.answers = AnswerMapper.fromDTOs(dto.answers);
        }
        return question;
    }
}
