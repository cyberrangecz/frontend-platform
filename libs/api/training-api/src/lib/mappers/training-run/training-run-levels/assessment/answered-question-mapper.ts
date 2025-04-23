import { Question } from '@crczp/training-model';
import { AnsweredExtendedMatchingItemsMapper } from './answered-extended-matching-items-mapper';
import { AnsweredFreeFormQuestionMapper } from './answered-free-form-question-mapper';
import { AnsweredMultipleChoiceQuestionMapper } from './answered-multiple-choice-question-mapper';

/**
 * @dynamic
 */
export class AnsweredQuestionMapper {
    static fromDTO(dto: any): Question {
        let question: Question;

        switch (dto.question_type) {
            case 'FFQ': {
                question = AnsweredFreeFormQuestionMapper.fromDTO(dto);
                break;
            }
            case 'EMI': {
                question = AnsweredExtendedMatchingItemsMapper.fromDTO(dto);
                break;
            }
            case 'MCQ': {
                question = AnsweredMultipleChoiceQuestionMapper.fromDTO(dto);
                break;
            }
            default: {
                console.error('Could not map question from JSON to any of known types');
                return undefined;
            }
        }

        question.id = dto.id;
        question.required = dto.answer_required;
        question.penalty = dto.penalty;
        question.score = dto.points;
        question.order = dto.order;
        return question;
    }

    static fromDTOs(dtos: any[]): Question[] {
        return dtos.map((dto) => AnsweredQuestionMapper.fromDTO(dto));
    }
}
