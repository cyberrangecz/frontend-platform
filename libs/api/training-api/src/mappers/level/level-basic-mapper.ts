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
    mappedProperties: ['id', 'title', 'order', 'estimatedDuration', 'maxScore'],
    mappers: {
        type: (dto) => levelTypeFromDTO(dto.level_type),
    },
    constructor: (data) => InfoLevelBasic.schema().parse(data),
});

const accessLevelBasicMapper = MapperBuilder.createDTOtoModelMapper<
    AccessLevelBasicDto,
    AccessLevelBasic
>({
    mappedProperties: ['id', 'title', 'order', 'estimatedDuration', 'maxScore'],
    mappers: {
        type: (dto) => levelTypeFromDTO(dto.level_type),
    },
    constructor: (data) => AccessLevelBasic.schema().parse(data),
});

export function levelBasicMapper(
    dto: LevelBasicDto,
): InfoLevelBasic | AccessLevelBasic | TrainingLevelBasic | AssessmentLevelBasic {
    switch (dto.level_type) {
        case 'INFO_LEVEL':
            return infoLevelBasicMapper(dto);
        case 'ACCESS_LEVEL':
            return accessLevelBasicMapper(dto);
        case 'ASSESSMENT_LEVEL':
            return assessmentLevelBasicMapper(dto);
        case 'TRAINING_LEVEL':
            return trainingLevelBasicMapper(dto);
        default:
            throw new Error(
                `Unknown level type: ${(dto as LevelBasicDto).level_type}`,
            );
    }
}

export function levelBasicArrayMapper(
    dtos: LevelBasicDto[],
): (InfoLevelBasic | AccessLevelBasic | TrainingLevelBasic | AssessmentLevelBasic)[] {
    return dtos.map(levelBasicMapper);
}
