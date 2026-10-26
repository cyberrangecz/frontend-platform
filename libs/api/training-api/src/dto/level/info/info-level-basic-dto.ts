import { z } from 'zod';
import {AbstractLevelDTOLevelTypeEnum} from '../abstract-level-dto';
import { idSchema } from '../../shared-schemas';

export const InfoLevelBasicDtoSchema = z.object({
    id: idSchema,
    title: z.string().min(1),
    order: z.number().nonnegative().int(),
    estimated_duration: z.number().nonnegative(),
    max_score: z.number().nonnegative(),
    level_type: z.literal(AbstractLevelDTOLevelTypeEnum.INFO),
});

export type InfoLevelBasicDto = z.infer<typeof InfoLevelBasicDtoSchema>;
