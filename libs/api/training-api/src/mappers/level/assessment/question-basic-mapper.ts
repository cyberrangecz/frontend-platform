import { MapperBuilder } from '@crczp/api-common';
import { QuestionBasicDtoSchema } from '../../../dto/level/assessment/assessment-level-basic-dto';
import { QuestionBasic } from '@crczp/training-model';
import { z } from 'zod';

type QuestionBasicDto = z.infer<typeof QuestionBasicDtoSchema>;

export const questionBasicMapper = MapperBuilder.createDTOtoModelMapper<QuestionBasicDto, QuestionBasic>({
    mappedProperties: ['id', 'order', 'penalty', 'questionType'],
    mappers: {
        score: (dto) => dto.points,
        required: (dto) => dto.answer_required,
    },
    constructor: (data) => QuestionBasic.schema().parse(data),
});

/**
 * @param dtos - array of {@link QuestionBasicDto} to map
 * @returns array of {@link QuestionBasic} model instances
 */
export function questionBasicArrayMapper(dtos: QuestionBasicDto[]): QuestionBasic[] {
    return dtos.map(questionBasicMapper);
}
