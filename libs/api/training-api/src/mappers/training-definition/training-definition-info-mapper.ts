import {TrainingDefinitionInfo} from '@crczp/training-model';
import {TrainingDefinitionInfoDTO} from '../../dto/training-definition/training-definition-info-dto';
import {TrainingDefinitionMapper} from './training-definition-mapper';

/**
 * @dynamic
 */
export class TrainingDefinitionInfoMapper {
    static fromDTO(dto: TrainingDefinitionInfoDTO): TrainingDefinitionInfo {
        const result = new TrainingDefinitionInfo();
        result.id = dto.id;
        result.title = dto.title;
        result.state = TrainingDefinitionMapper.stateFromDTO(dto.state);
        return result;
    }

    static fromDTOs(dtos: TrainingDefinitionInfoDTO[]): TrainingDefinitionInfo[] {
        return dtos.map((dto) => TrainingDefinitionInfoMapper.fromDTO(dto));
    }
}
