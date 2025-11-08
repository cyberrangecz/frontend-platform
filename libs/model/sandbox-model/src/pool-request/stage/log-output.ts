import { Z } from 'zod-class';
import { z } from 'zod';

export class LogOutput extends Z.class({
    content: z.string(),
    rows: z.number().nonnegative('Rows count cannot be negative'),
}) {}
