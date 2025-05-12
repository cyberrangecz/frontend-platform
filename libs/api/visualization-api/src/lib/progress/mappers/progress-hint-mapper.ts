import { Hint } from '@crczp/training-model';
import { ProgressHintDTO } from '../dtos';
import { ProgressHint } from '@crczp/visualization-model';


export class ProgressHintMapper {
    static fromDTOs(dtos: ProgressHintDTO[]): ProgressHint[] {
        return dtos ? dtos.map((dto) => ProgressHintMapper.fromDTO(dto)) : [];
    }

    static fromDTO(dto: ProgressHintDTO): Hint {
        const result = new Hint();
        result.id = dto.hint_id;
        result.title = dto.hint_title;
        result.content = dto.hint_content;
        return result;
    }
}
