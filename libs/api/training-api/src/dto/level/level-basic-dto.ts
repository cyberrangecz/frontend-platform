import { z } from 'zod';
import { InfoLevelBasicDtoSchema } from './info/info-level-basic-dto';
import { AccessLevelBasicDtoSchema } from './access/access-level-basic-dto';
import { AssessmentLevelBasicDtoSchema } from './assessment/assessment-level-basic-dto';
import { TrainingLevelBasicDtoSchema } from './training/training-level-basic-dto';

export const LevelBasicDtoSchema = z.discriminatedUnion('level_type', [
    InfoLevelBasicDtoSchema,
    AccessLevelBasicDtoSchema,
    AssessmentLevelBasicDtoSchema,
    TrainingLevelBasicDtoSchema,
]);

export type LevelBasicDto = z.infer<typeof LevelBasicDtoSchema>;
