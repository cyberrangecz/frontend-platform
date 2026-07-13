import { Z } from 'zod-class';
import { z } from 'zod';
import { idSchema } from '../shared-schemas';

export class TrainingRunBasicDto extends Z.class({
    id: idSchema,
    state: z.enum(['RUNNING', 'FINISHED', 'ARCHIVED']),
    start_time: z.coerce.date(),
    end_time: z.coerce.date(),
    sandbox_instance_ref_id: z.string().nullable(),
    training_instance_id: z.number().nonnegative().int(),
    training_definition_id: z.number().nonnegative().int(),
    current_level_id: z.number().nonnegative().int().nullable(),
    current_level_order: z.number().nonnegative().int().nullable(),
}) {}
