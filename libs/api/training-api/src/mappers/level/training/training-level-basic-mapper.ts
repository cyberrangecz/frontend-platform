import { MapperBuilder } from '@crczp/api-common';
import { TrainingLevelBasicDtoSchema } from '../../../dto/level/training/training-level-basic-dto';
import { TrainingLevelBasic, MitreTechniqueBasic } from '@crczp/training-model';
import { z } from 'zod';
import { levelTypeFromDTO } from '../level-type-from-dto';
import { hintBasicArrayMapper } from './hint-basic-mapper';

type TrainingLevelBasicDto = z.infer<typeof TrainingLevelBasicDtoSchema>;

/**
 * @param dtos - array of {@link TrainingLevelBasicDto} to map
 * @returns array of {@link TrainingLevelBasic} model instances
 */
export const trainingLevelBasicMapper = MapperBuilder.createDTOtoModelMapper<
    TrainingLevelBasicDto,
    TrainingLevelBasic
>({
    mappedProperties: ['id', 'title', 'order', 'estimatedDuration', 'minimalPossibleSolveTime', 'maxScore', 'incorrectAnswerLimit'],
    mappers: {
        type: (dto) => levelTypeFromDTO(dto.type),
        isSolutionPenalized: (dto) => dto.solution_penalized,
        hints: (dto) => hintBasicArrayMapper(dto.hints),
        mitreTechniques: (dto) =>
            dto.mitre_techniques.map((m) =>
                MitreTechniqueBasic.schema().parse({ id: m.id, techniqueKey: m.technique_key }),
            ),
    },
    constructor: (data) => TrainingLevelBasic.schema().parse(data),
});

export function trainingLevelBasicArrayMapper(dtos: TrainingLevelBasicDto[]): TrainingLevelBasic[] {
    return dtos.map(trainingLevelBasicMapper);
}
