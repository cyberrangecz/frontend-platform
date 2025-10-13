import {OptionDTO} from '../dtos';
import {AssessmentOption} from '@crczp/visualization-model';
import {UserMapper} from '@crczp/training-api';

export class OptionMapper {
    static fromDTOs(dtos: OptionDTO[]): AssessmentOption[] {
        return dtos.map((dto) => OptionMapper.fromDTO(dto));
    }

    static fromDTO(dto: OptionDTO): AssessmentOption {
        const options = new AssessmentOption();
        options.text = dto.text;
        options.correct = dto.correct;
        options.participants = UserMapper.fromDTOs(dto.participants);
        return options;
    }
}
