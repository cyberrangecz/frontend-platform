import { z } from 'zod';
import { AbstractLevelDTO } from '../abstract-level-dto';
import { AssessmentLevelDTO } from './assessment-level-dto';
import { AbstractQuestionDTO } from './abstact-question-dto';
import { idSchema } from '../../shared-schemas';

export const QuestionBasicDtoSchema: z.ZodType<any> = z.lazy(() =>
    z.object({
        id: idSchema,
        order: z.number().nonnegative().int(),
        points: z.number().nonnegative().default(0),
        penalty: z.number().nonnegative().default(0),
        answer_required: z.boolean(),
        question_type: z.enum([
            AbstractQuestionDTO.QuestionTypeEnum.FFQ,
            AbstractQuestionDTO.QuestionTypeEnum.MCQ,
            AbstractQuestionDTO.QuestionTypeEnum.EMI,
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
    level_type: z.literal(AbstractLevelDTO.LevelTypeEnum.ASSESSMENT),
    assessment_type: z.enum([
        AssessmentLevelDTO.AssessmentTypeEnum.TEST,
        AssessmentLevelDTO.AssessmentTypeEnum.QUESTIONNAIRE,
    ]),
    questions: z.array(QuestionBasicDtoSchema),
});

export type AssessmentLevelBasicDto = z.infer<typeof AssessmentLevelBasicDtoSchema>;
