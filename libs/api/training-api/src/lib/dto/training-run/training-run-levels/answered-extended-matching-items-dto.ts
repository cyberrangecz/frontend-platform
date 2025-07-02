import {AbstractQuestionCreateDTO, AbstractQuestionDTO} from '../../level/assessment/abstact-question-dto';
import {ExtendedMatchingOptionDTO} from '../../level/assessment/extended-matching-option-dto';
import {AnsweredExtendedMatchingStatementDTO} from './answered-extended-matching-statement-dto';

export class AnsweredExtendedMatchingItemsDTO implements AbstractQuestionCreateDTO {
    answer_required: boolean;
    extended_matching_statements: AnsweredExtendedMatchingStatementDTO[];
    extended_matching_options: ExtendedMatchingOptionDTO[];
    order: number;
    penalty: number;
    points: number;
    question_type: AbstractQuestionDTO.QuestionTypeEnum;
    text: string;
}
