import { z } from 'zod';
import { AbstractLevelDTO } from '../abstract-level-dto';
import { idSchema } from '../../shared-schemas';

export const HintBasicDtoSchema = z.object({
    id: idSchema,
    title: z.string().min(1),
    hint_penalty: z.number().nonnegative().default(0),
});

export type HintBasicDto = z.infer<typeof HintBasicDtoSchema>;

export const MitreTechniqueDtoSchema = z.object({
    id: idSchema,
    technique_key: z.string(),
});

export type MitreTechniqueDto = z.infer<typeof MitreTechniqueDtoSchema>;

export const TrainingLevelBasicDtoSchema = z.object({
    id: idSchema,
    title: z.string().min(1),
    order: z.number().nonnegative().int(),
    estimated_duration: z.number().nonnegative(),
    minimal_possible_solve_time: z.number().nonnegative(),
    max_score: z.number().nonnegative(),
    type: z.literal('linear_training'),
    level_type: z.literal(AbstractLevelDTO.LevelTypeEnum.TRAINING),
    hints: z.array(HintBasicDtoSchema),
    incorrect_answer_limit: z.number().nonnegative().int(),
    solution_penalized: z.boolean(),
    mitre_techniques: z.array(MitreTechniqueDtoSchema),
});

export type TrainingLevelBasicDto = z.infer<typeof TrainingLevelBasicDtoSchema>;
