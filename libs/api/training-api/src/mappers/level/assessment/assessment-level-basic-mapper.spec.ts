import { describe, it, expect } from 'vitest';
import { AssessmentLevelBasic, AssessmentTypeEnum, AbstractLevelTypeEnum } from '@crczp/training-model';
import { assessmentLevelBasicMapper, assessmentLevelBasicArrayMapper } from './assessment-level-basic-mapper';
import { AssessmentLevelBasicDto } from '../../../dto/level/assessment/assessment-level-basic-dto';

const validDto: AssessmentLevelBasicDto = {
    id: 1,
    title: 'Assessment Level',
    order: 2,
    estimated_duration: 25,
    max_score: 100,
    level_type: 'ASSESSMENT_LEVEL',
    assessment_type: 'TEST',
    questions: [{ id: 10, order: 0, points: 5, penalty: 0, answer_required: true, question_type: 'FFQ' }],
};

describe('assessmentLevelBasicMapper', () => {
    it('maps all DTO fields to correct model properties', () => {
        const result = assessmentLevelBasicMapper(validDto);
        expect(result).toBeInstanceOf(AssessmentLevelBasic);
        expect(result).toMatchObject({
            id: 1,
            title: 'Assessment Level',
            order: 2,
            estimatedDuration: 25,
            maxScore: 100,
            type: AbstractLevelTypeEnum.Assessment,
            assessmentType: AssessmentTypeEnum.Test,
        });
        expect(result.questions).toHaveLength(1);
        expect(result.questions[0].id).toBe(10);
    });

    it('throws on DTO mismatch — level_type is unknown', () => {
        expect(() => assessmentLevelBasicMapper({ ...validDto, level_type: 'UNKNOWN_LEVEL' } as any)).toThrow();
    });

    it('maps with empty questions array and QUESTIONNAIRE type', () => {
        const result = assessmentLevelBasicMapper({
            ...validDto,
            assessment_type: 'QUESTIONNAIRE',
            questions: [],
        });
        expect(result.assessmentType).toBe(AssessmentTypeEnum.Questionnaire);
        expect(result.questions).toEqual([]);
    });
});

describe('assessmentLevelBasicArrayMapper', () => {
    it('maps array and returns empty array for empty input', () => {
        expect(assessmentLevelBasicArrayMapper([])).toEqual([]);
        const results = assessmentLevelBasicArrayMapper([validDto, { ...validDto, id: 2 }]);
        expect(results).toHaveLength(2);
        expect(results[1].id).toBe(2);
    });
});
