import { MapperBuilder } from '@crczp/api-common';
import { MitreTechniqueDtoSchema } from '../../dto/level/training/training-level-basic-dto';
import { MitreTechniqueBasic } from '@crczp/training-model';
import { z } from 'zod';

type MitreTechniqueDto = z.infer<typeof MitreTechniqueDtoSchema>;

export const mitreTechniqueBasicMapper = MapperBuilder.createDTOtoModelMapper<
    MitreTechniqueDto,
    MitreTechniqueBasic
>({
    mappedProperties: ['id'],
    mappers: {
        techniqueKey: (dto) => dto.technique_key,
    },
    constructor: (data) => MitreTechniqueBasic.schema().parse(data),
});

export function mitreTechniqueBasicArrayMapper(
    dtos: MitreTechniqueDto[],
): MitreTechniqueBasic[] {
    return dtos.map(mitreTechniqueBasicMapper);
}
