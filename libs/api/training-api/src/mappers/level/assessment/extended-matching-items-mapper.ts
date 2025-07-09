import {ExtendedMatchingItems, ExtendedMatchingOption, ExtendedMatchingStatement} from '@crczp/training-model';
import {AbstractQuestionDTO} from '../../../dto/level/assessment/abstact-question-dto';
import {ExtendedMatchingItemsAnswerDTO} from '../../../dto/level/assessment/extended-matching-items-answer-dto';
import {ExtendedMatchingItemsDTO} from '../../../dto/level/assessment/extended-matching-items-dto';
import {ExtendedMatchingStatementDTO} from '../../../dto/level/assessment/extended-matching-statement-dto';
import {ExtendedMatchingOptionDTO} from '../../../dto/level/assessment/extended-matching-option-dto';

export class ExtendedMatchingItemsMapper {
    static fromDTO(dto: ExtendedMatchingItemsDTO): ExtendedMatchingItems {
        const result = new ExtendedMatchingItems(dto.text);
        result.extendedMatchingStatements = dto.extended_matching_statements?.map((statementDTO) =>
            this.fromStatementDTO(statementDTO),
        );
        result.extendedMatchingOptions = dto.extended_matching_options?.map((optionDTO) =>
            this.fromOptionDTO(optionDTO),
        );
        return result;
    }

    static fromStatementDTO(statementDTO: ExtendedMatchingStatementDTO): ExtendedMatchingStatement {
        return {
            id: statementDTO.id,
            order: statementDTO.order,
            text: statementDTO.text,
            correctOptionOrder: statementDTO.correct_option_order,
        };
    }

    static fromOptionDTO(optionDTO: ExtendedMatchingOptionDTO): ExtendedMatchingOption {
        return {
            id: optionDTO.id,
            order: optionDTO.order,
            text: optionDTO.text,
        };
    }

    static toAnswersDTO(question: ExtendedMatchingItems): ExtendedMatchingItemsAnswerDTO {
        const result = new ExtendedMatchingItemsAnswerDTO();
        result.question_id = question.id;
        result.extended_matching_pairs = question.userAnswers;
        return result;
    }

    static toCreateDTO(question: ExtendedMatchingItems): ExtendedMatchingItemsDTO {
        const questionDTO = new ExtendedMatchingItemsDTO();
        questionDTO.question_type = AbstractQuestionDTO.QuestionTypeEnum.EMI;
        questionDTO.extended_matching_options = question.extendedMatchingOptions;
        questionDTO.extended_matching_statements = question.extendedMatchingStatements.map(
            (ems) => new ExtendedMatchingStatementDTO(ems.id, ems.order, ems.text, ems.correctOptionOrder),
        );
        return questionDTO;
    }
}
