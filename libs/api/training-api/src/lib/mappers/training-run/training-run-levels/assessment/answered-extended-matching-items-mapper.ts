import { ExtendedMatchingItems } from '@crczp/training-model';
import { ExtendedMatchingOptionDTO } from '../../../../dto/level/assessment/extended-matching-option-dto';
import { ExtendedMatchingStatement } from '@crczp/training-model';
import { ExtendedMatchingOption } from '@crczp/training-model';
import { AnsweredExtendedMatchingItemsDTO } from '../../../../dto/training-run/training-run-levels/answered-extended-matching-items-dto';
import { AnsweredExtendedMatchingStatementDTO } from './../../../../dto/training-run/training-run-levels/answered-extended-matching-statement-dto';

export class AnsweredExtendedMatchingItemsMapper {
    static fromDTO(dto: AnsweredExtendedMatchingItemsDTO): ExtendedMatchingItems {
        const result = new ExtendedMatchingItems(dto.text);
        result.extendedMatchingStatements = dto.extended_matching_statements?.map((statementDTO) =>
            this.fromStatementDTO(statementDTO),
        );
        result.extendedMatchingOptions = dto.extended_matching_options?.map((optionDTO) =>
            this.fromOptionDTO(optionDTO),
        );
        return result;
    }

    static fromStatementDTO(statementDTO: AnsweredExtendedMatchingStatementDTO): ExtendedMatchingStatement {
        return {
            id: statementDTO.id,
            order: statementDTO.order,
            text: statementDTO.text,
            correctOptionOrder: statementDTO.user_option_order,
        };
    }

    static fromOptionDTO(optionDTO: ExtendedMatchingOptionDTO): ExtendedMatchingOption {
        return {
            id: optionDTO.id,
            order: optionDTO.order,
            text: optionDTO.text,
        };
    }
}
