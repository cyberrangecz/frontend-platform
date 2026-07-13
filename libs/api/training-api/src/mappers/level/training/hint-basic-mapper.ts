import { MapperBuilder } from '@crczp/api-common';
import { HintBasicDtoSchema } from '../../../dto/level/training/training-level-basic-dto';
import { HintBasic } from '@crczp/training-model';
import { z } from 'zod';

type HintBasicDto = z.infer<typeof HintBasicDtoSchema>;

export const hintBasicMapper = MapperBuilder.createDTOtoModelMapper<
    HintBasicDto,
    HintBasic
>({
    mappedProperties: ['id', 'title'],
    mappers: {
        penalty: (dto) => dto.hint_penalty,
    },
    constructor: (data) => HintBasic.schema().parse(data),
});

export function hintBasicArrayMapper(
    dtos: HintBasicDto[],
): HintBasic[] {
    return dtos.map(hintBasicMapper);
}
