import {AbstractQuestionCreateDTO, AbstractQuestionDTO} from './abstact-question-dto';
import {ExtendedMatchingStatementDTO} from './extended-matching-statement-dto';
import {ExtendedMatchingOptionDTO} from './extended-matching-option-dto';

export class ExtendedMatchingItemsDTO implements AbstractQuestionCreateDTO {
    answer_required: boolean;
    extended_matching_statements: ExtendedMatchingStatementDTO[];
    extended_matching_options: ExtendedMatchingOptionDTO[];
    order: number;
    penalty: number;
    points: number;
    question_type: AbstractQuestionDTO.QuestionTypeEnum;
    text: string;
}
