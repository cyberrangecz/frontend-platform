import { MapperBuilder } from '@crczp/api-common';
import { TrainingInstanceBasicDto } from '../../dto/training-instance/training-instance-basic-dto';
import { TrainingInstanceBasic } from '@crczp/training-model';

export const trainingInstanceBasicMapper = MapperBuilder.createDTOtoModelMapper<
    InstanceType<typeof TrainingInstanceBasicDto>,
    TrainingInstanceBasic
>({
    mappedProperties: [
        'id',
        'title',
        'startTime',
        'endTime',
    ],
    mappers: {
        'trainingDefinitionId': (dto) => dto.definition_id,
    },
    constructor: (data) => TrainingInstanceBasic.schema().parse(data),
});

export function trainingInstanceBasicArrayMapper(
    dtos: InstanceType<typeof TrainingInstanceBasicDto>[],
): TrainingInstanceBasic[] {
    return dtos.map(trainingInstanceBasicMapper);
}
