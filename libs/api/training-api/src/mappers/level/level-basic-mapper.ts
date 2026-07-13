import { MapperBuilder } from '@crczp/api-common';
import { LevelBasicDto } from '../../dto/level/level-basic-dto';
import { InfoLevelBasicDtoSchema } from '../../dto/level/info/info-level-basic-dto';
import { AccessLevelBasicDtoSchema } from '../../dto/level/access/access-level-basic-dto';
import {
    AccessLevelBasic,
    InfoLevelBasic,
    TrainingLevelBasic,
    AssessmentLevelBasic,
} from '@crczp/training-model';
import { trainingLevelBasicMapper } from './training/training-level-basic-mapper';
import { assessmentLevelBasicMapper } from './assessment/assessment-level-basic-mapper';
import { z } from 'zod';
import { levelTypeFromDTO } from './level-type-from-dto';

export { levelTypeFromDTO };

type InfoLevelBasicDto = z.infer<typeof InfoLevelBasicDtoSchema>;
type AccessLevelBasicDto = z.infer<typeof AccessLevelBasicDtoSchema>;

const infoLevelBasicMapper = MapperBuilder.createDTOtoModelMapper<
    InfoLevelBasicDto,
    InfoLevelBasic
>({
    mappedProperties: [
        'id',
        'title',
        'order',
        'estimatedDuration',
        'minimalPossibleSolveTime',
        'maxScore',
    ],
    mappers: {
        type: (dto) => levelTypeFromDTO(dto.type),
    },
    constructor: (data) => InfoLevelBasic.schema().parse(data),
});

const accessLevelBasicMapper = MapperBuilder.createDTOtoModelMapper<
    AccessLevelBasicDto,
    AccessLevelBasic
>({
    mappedProperties: [
        'id',
        'title',
        'order',
        'estimatedDuration',
        'minimalPossibleSolveTime',
        'maxScore',
    ],
    mappers: {
        type: (dto) => levelTypeFromDTO(dto.type),
    },
    constructor: (data) => AccessLevelBasic.schema().parse(data),
});

export function levelBasicMapper(
    dto: LevelBasicDto,
): InfoLevelBasic | AccessLevelBasic | TrainingLevelBasic | AssessmentLevelBasic {
    switch (dto.type) {
        case 'linear_info':
            return infoLevelBasicMapper(dto);
        case 'linear_access':
            return accessLevelBasicMapper(dto);
        case 'linear_assessment':
            return assessmentLevelBasicMapper(dto);
        case 'linear_training':
            return trainingLevelBasicMapper(dto);
        default:
            throw new Error(`Unknown level type: ${(dto as LevelBasicDto).type}`);
    }
}

export function levelBasicArrayMapper(
    dtos: LevelBasicDto[],
): (InfoLevelBasic | AccessLevelBasic | TrainingLevelBasic | AssessmentLevelBasic)[] {
    return dtos.map(levelBasicMapper);
}
