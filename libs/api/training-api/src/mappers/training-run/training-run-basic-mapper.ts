import { MapperBuilder } from '@crczp/api-common';
import { TrainingRunBasicDto } from '../../dto/training-run/training-run-basic-dto';
import { TrainingRunBasic, TrainingRunStateEnum } from '@crczp/training-model';
import { UserMapper } from '../user/user-mapper';

function stateFromDTO(state: string): TrainingRunStateEnum {
    switch (state) {
        case 'FINISHED':
            return TrainingRunStateEnum.FINISHED;
        case 'ARCHIVED':
            return TrainingRunStateEnum.ARCHIVED;
        default:
            return TrainingRunStateEnum.RUNNING;
    }
}

export const trainingRunBasicMapper = MapperBuilder.createDTOtoModelMapper<
    InstanceType<typeof TrainingRunBasicDto>,
    TrainingRunBasic
>({
    mappedProperties: ['id', 'trainingInstanceId', 'trainingDefinitionId', 'startTime', 'endTime'],
    mappers: {
        sandboxInstanceId: (dto) => dto.sandbox_instance_ref_id,
        state: (dto) => stateFromDTO(dto.state),
        currentLevelId: (dto) => dto.current_level_id,
        currentLevelOrder: (dto) => dto.current_level_order,
        participantRef: (dto) => UserMapper.fromDTO(dto.participant_ref),
    },
    constructor: (data) => TrainingRunBasic.schema().parse(data),
});

export function trainingRunBasicArrayMapper(
    dtos: InstanceType<typeof TrainingRunBasicDto>[],
): TrainingRunBasic[] {
    return dtos.map(trainingRunBasicMapper);
}
