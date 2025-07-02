import {Hint} from '@crczp/training-model';
import {HintDTO, HintDTOClass} from '../../../dto/level/training/hint-dto';

/**
 * @dynamic
 */
export class HintMapper {
    static fromDTO(dto: HintDTO): Hint {
        const result = new Hint();
        result.id = dto.id;
        result.content = dto.content;
        result.title = dto.title;
        result.penalty = dto.hint_penalty;
        result.order = dto.order;
        return result;
    }

    static fromDTOs(dtos: HintDTO[]): Hint[] {
        return dtos.map((dto) => HintMapper.fromDTO(dto)).sort((a, b) => a.order - b.order);
    }

    static toDTO(hint: Hint): HintDTO {
        const result = new HintDTOClass();
        result.id = hint.id;
        result.content = hint.content;
        result.title = hint.title;
        result.hint_penalty = hint.penalty;
        result.order = hint.order;
        return result;
    }

    static toDTOs(hints: Hint[]): HintDTO[] {
        return hints.map((hint) => HintMapper.toDTO(hint));
    }
}
