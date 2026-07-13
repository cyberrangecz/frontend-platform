import { MapperBuilder } from '@crczp/api-common';
import { TrainingDefinitionBasicDto } from '../../dto/training-definition/training-definition-basic-dto';
import {
    TrainingDefinitionBasic,
    TrainingDefinitionStateEnum,
} from '@crczp/training-model';
import { levelBasicMapper } from '../level/level-basic-mapper';

function stateFromDTO(state: string): TrainingDefinitionStateEnum {
    switch (state) {
        case 'Released':
            return TrainingDefinitionStateEnum.Released;
        case 'Archived':
            return TrainingDefinitionStateEnum.Archived;
        default:
            return TrainingDefinitionStateEnum.Unreleased;
    }
}

export const trainingDefinitionBasicMapper =
    MapperBuilder.createDTOtoModelMapper<
        InstanceType<typeof TrainingDefinitionBasicDto>,
        TrainingDefinitionBasic
    >({
        mappedProperties: ['id', 'title', 'description', 'estimatedDuration'],
        mappers: {
            state: (dto) => stateFromDTO(dto.state),
            levels: (dto) => dto.levels.map(levelBasicMapper),
        },
        constructor: (data) => TrainingDefinitionBasic.schema().parse(data),
    });

export function trainingDefinitionBasicArrayMapper(
    dtos: InstanceType<typeof TrainingDefinitionBasicDto>[],
): TrainingDefinitionBasic[] {
    return dtos.map(trainingDefinitionBasicMapper);
}
