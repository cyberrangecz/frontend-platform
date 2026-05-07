import { z } from 'zod';

export const idSchema = z.number().nonnegative('Id must be a non-negative number').int('Id must be an integer');
