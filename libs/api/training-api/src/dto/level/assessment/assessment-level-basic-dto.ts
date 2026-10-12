import { z } from 'zod';
import {AbstractLevelDTOLevelTypeEnum} from '../abstract-level-dto';
import {AssessmentLevelDTOAssessmentTypeEnum} from './assessment-level-dto';
import {AbstractQuestionDTOQuestionTypeEnum} from './abstact-question-dto';
import { idSchema } from '../../shared-schemas';

export const QuestionBasicDtoSchema: z.ZodType<any> = z.lazy(() =>
    z.object({
        id: idSchema,
        order: z.number().nonnegative().int(),
        points: z.number().nonnegative().default(0),
        penalty: z.number().nonnegative().default(0),
        answer_required: z.boolean(),
        question_type: z.enum([
            AbstractQuestionDTOQuestionTypeEnum.FFQ,
            AbstractQuestionDTOQuestionTypeEnum.MCQ,
            AbstractQuestionDTOQuestionTypeEnum.EMI,
        ]),
    })
);

export type QuestionBasicDto = z.infer<typeof QuestionBasicDtoSchema>;

export const AssessmentLevelBasicDtoSchema = z.object({
    id: idSchema,
    title: z.string().min(1),
    order: z.number().nonnegative().int(),
    estimated_duration: z.number().nonnegative(),
    max_score: z.number().nonnegative(),
    level_type: z.literal(AbstractLevelDTOLevelTypeEnum.ASSESSMENT),
    assessment_type: z.enum([
        AssessmentLevelDTOAssessmentTypeEnum.TEST,
        AssessmentLevelDTOAssessmentTypeEnum.QUESTIONNAIRE,
    ]),
    questions: z.array(QuestionBasicDtoSchema),
});

export type AssessmentLevelBasicDto = z.infer<typeof AssessmentLevelBasicDtoSchema>;
