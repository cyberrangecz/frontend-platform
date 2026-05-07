import { z } from 'zod';
import { AbstractLevelDTO } from '../abstract-level-dto';
import { idSchema } from '../../shared-schemas';

export const AccessLevelBasicDtoSchema = z.object({
    id: idSchema,
    title: z.string().min(1),
    order: z.number().nonnegative().int(),
    estimated_duration: z.number().nonnegative(),
    minimal_possible_solve_time: z.number().nonnegative(),
    max_score: z.number().nonnegative(),
    type: z.literal('linear_access'),
    level_type: z.literal(AbstractLevelDTO.LevelTypeEnum.ACCESS),
});

export type AccessLevelBasicDto = z.infer<typeof AccessLevelBasicDtoSchema>;
