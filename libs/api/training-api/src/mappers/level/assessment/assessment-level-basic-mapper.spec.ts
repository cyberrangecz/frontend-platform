import { describe, it, expect } from 'vitest';
import { AssessmentLevelBasic, AssessmentTypeEnum, AbstractLevelTypeEnum } from '@crczp/training-model';
import { assessmentLevelBasicMapper, assessmentLevelBasicArrayMapper } from './assessment-level-basic-mapper';

const validDto = {
    id: 1,
    title: 'Assessment Level',
    order: 2,
    estimated_duration: 25,
    minimal_possible_solve_time: 5,
    max_score: 100,
    type: 'linear_assessment' as const,
    level_type: 'ASSESSMENT',
    assessment_type: 'TEST',
    questions: [{ id: 10, order: 0, points: 5, penalty: 0, answer_required: true, question_type: 'FFQ' }],
};

describe('assessmentLevelBasicMapper', () => {
    it('maps all DTO fields to correct model properties', () => {
        const result = assessmentLevelBasicMapper(validDto as any);
        expect(result).toBeInstanceOf(AssessmentLevelBasic);
        expect(result).toMatchObject({
            id: 1,
            title: 'Assessment Level',
            order: 2,
            estimatedDuration: 25,
            minimalPossibleSolveTime: 5,
            maxScore: 100,
            type: AbstractLevelTypeEnum.Assessment,
            assessmentType: AssessmentTypeEnum.Test,
        });
        expect(result.questions).toHaveLength(1);
        expect(result.questions[0].id).toBe(10);
    });

    it('throws on DTO mismatch — type is unknown', () => {
        expect(() => assessmentLevelBasicMapper({ ...validDto, type: 'linear_unknown' } as any)).toThrow();
    });

    it('maps with empty questions array and QUESTIONNAIRE type', () => {
        const result = assessmentLevelBasicMapper({
            ...validDto,
            assessment_type: 'QUESTIONNAIRE',
            questions: [],
        } as any);
        expect(result.assessmentType).toBe(AssessmentTypeEnum.Questionnaire);
        expect(result.questions).toEqual([]);
    });
});

describe('assessmentLevelBasicArrayMapper', () => {
    it('maps array and returns empty array for empty input', () => {
        expect(assessmentLevelBasicArrayMapper([])).toEqual([]);
        const results = assessmentLevelBasicArrayMapper([validDto, { ...validDto, id: 2 }] as any);
        expect(results).toHaveLength(2);
        expect(results[1].id).toBe(2);
    });
});
