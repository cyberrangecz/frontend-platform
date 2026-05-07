import { Z } from 'zod-class';
import { z } from 'zod';
import { abstractLevelBasicSchema } from './abstract-level-basic';
import {AssessmentTypeEnum} from '../enums/assessment-type.enum';
import { QuestionBasic } from '../questions/question';
import {Question} from '../questions/question';
import {Level} from './level';

/** Basic read-only assessment level data safe for all roles. Subset of {@link AssessmentLevel}. */
export class AssessmentLevelBasic extends Z.class({
    ...abstractLevelBasicSchema.shape,
    assessmentType: z.nativeEnum(AssessmentTypeEnum),
    questions: z.array(QuestionBasic.schema()),
}) {}

/**
 * Class representing level in a training of type Assessment
 */
export class AssessmentLevel extends Level {
    questions: Question[] = [];
    instructions!: string;
    assessmentType!: AssessmentTypeEnum;
}
