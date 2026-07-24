import { Z } from 'zod-class';
import { z } from 'zod';
import { LevelBasicDtoSchema } from '../level/level-basic-dto';
import { idSchema } from '../shared-schemas';

export class TrainingDefinitionBasicDto extends Z.class({
    id: idSchema,
    title: z.string().min(1, 'Title is required'),
    description: z.string(),
    estimated_duration: z.number().nonnegative('Estimated duration must be non-negative'),
    levels: z.array(LevelBasicDtoSchema),
}) {}
