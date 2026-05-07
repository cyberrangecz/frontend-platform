import { Z } from 'zod-class';
import { z } from 'zod';
import { LevelBasicDtoSchema } from '../level/level-basic-dto';
import { idSchema } from '../shared-schemas';

const trainingDefinitionStateEnum = z.enum(['UNRELEASED', 'RELEASED', 'ARCHIVED', 'PRIVATED']);

export type TrainingDefinitionState = z.infer<typeof trainingDefinitionStateEnum>;

export class TrainingDefinitionBasicDto extends Z.class({
    id: idSchema,
    title: z.string().min(1, 'Title is required'),
    state: trainingDefinitionStateEnum,
    description: z.string(),
    estimated_duration: z.number().nonnegative('Estimated duration must be non-negative'),
    levels: z.array(LevelBasicDtoSchema),
}) {}
