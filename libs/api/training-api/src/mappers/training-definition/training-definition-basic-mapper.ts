import { MapperBuilder } from '@crczp/api-common';
import { TrainingDefinitionBasicDto } from '../../dto/training-definition/training-definition-basic-dto';
import { TrainingDefinitionBasic } from '@crczp/training-model';
import { levelBasicMapper } from '../level/level-basic-mapper';

export const trainingDefinitionBasicMapper =
    MapperBuilder.createDTOtoModelMapper<
        InstanceType<typeof TrainingDefinitionBasicDto>,
        TrainingDefinitionBasic
    >({
        mappedProperties: ['id', 'title', 'description', 'estimatedDuration'],
        mappers: {
            levels: (dto) => dto.levels.map(levelBasicMapper),
        },
        constructor: (data) => TrainingDefinitionBasic.schema().parse(data),
    });

export function trainingDefinitionBasicArrayMapper(
    dtos: InstanceType<typeof TrainingDefinitionBasicDto>[],
): TrainingDefinitionBasic[] {
    return dtos.map(trainingDefinitionBasicMapper);
}
