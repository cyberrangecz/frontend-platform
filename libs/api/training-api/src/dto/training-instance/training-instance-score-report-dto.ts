import { Z } from 'zod-class';
import { z } from 'zod';
import { idSchema } from '../shared-schemas';
import { LevelBasicDtoSchema } from '../level/level-basic-dto';

export class ParticipantScoreRowDto extends Z.class({
    rank: z.number().int(),
    training_run_id: idSchema,
    user_ref_id: idSchema,
    login: z.string(),
    name: z.string(),
    mail: z.string(),
    finished: z.boolean(),
    started_at: z.number().int(),
    ended_at: z.number().int().nullable(),
    duration_seconds: z.number().int().nullable(),
    score_by_level_id: z.record(z.string(), z.number().int()),
    training_score: z.number().int(),
    assessment_score: z.number().int(),
    total_score: z.number().int(),
    hints_taken: z.number().int(),
    wrong_answers: z.number().int(),
    solutions_displayed: z.number().int(),
}) {}

export class TrainingInstanceScoreReportDto extends Z.class({
    training_instance_id: idSchema,
    instance_end_at: z.number().int(),
    scored_levels: z.array(LevelBasicDtoSchema),
    rows: z.array(ParticipantScoreRowDto.schema()),
}) {}
