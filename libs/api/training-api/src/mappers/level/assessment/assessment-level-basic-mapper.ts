import { MapperBuilder } from '@crczp/api-common';
import { AssessmentLevelBasicDtoSchema } from '../../../dto/level/assessment/assessment-level-basic-dto';
import { AssessmentLevelBasic, AssessmentTypeEnum } from '@crczp/training-model';
import { z } from 'zod';
import { levelTypeFromDTO } from '../level-type-from-dto';
import { questionBasicArrayMapper } from './question-basic-mapper';

type AssessmentLevelBasicDto = z.infer<typeof AssessmentLevelBasicDtoSchema>;

function assessmentTypeFromDTO(type: string): AssessmentTypeEnum {
    switch (type.toLowerCase()) {
        case 'questionnaire': return AssessmentTypeEnum.Questionnaire;
        default:              return AssessmentTypeEnum.Test;
    }
}

export const assessmentLevelBasicMapper = MapperBuilder.createDTOtoModelMapper<
    AssessmentLevelBasicDto,
    AssessmentLevelBasic
>({
    mappedProperties: ['id', 'title', 'order', 'estimatedDuration', 'maxScore'],
    mappers: {
        type: (dto) => levelTypeFromDTO(dto.level_type),
        assessmentType: (dto) => assessmentTypeFromDTO(dto.assessment_type),
        questions: (dto) => questionBasicArrayMapper(dto.questions),
    },
    constructor: (data) => AssessmentLevelBasic.schema().parse(data),
});

/**
 * @param dtos - array of {@link AssessmentLevelBasicDto} to map
 * @returns array of {@link AssessmentLevelBasic} model instances
 */
export function assessmentLevelBasicArrayMapper(dtos: AssessmentLevelBasicDto[]): AssessmentLevelBasic[] {
    return dtos.map(assessmentLevelBasicMapper);
}
