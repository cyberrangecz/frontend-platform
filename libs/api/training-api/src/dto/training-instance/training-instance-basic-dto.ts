import { Z } from 'zod-class';
import { z } from 'zod';
import { idSchema } from '../shared-schemas';

export class TrainingInstanceBasicDto extends Z.class({
    id: idSchema,
    title: z.string().min(1, 'Title is required'),
    start_time: z.coerce.date(),
    end_time: z.coerce.date(),
    definition_id: z.number().nonnegative().int(),
}) {}
