import { describe, it, expect } from 'vitest';
import { QuestionBasic } from '@crczp/training-model';
import { questionBasicMapper, questionBasicArrayMapper } from './question-basic-mapper';

const validDto = {
    id: 1,
    order: 2,
    points: 10,
    penalty: 5,
    answer_required: true,
    question_type: 'FFQ',
};

describe('questionBasicMapper', () => {
    it('maps all DTO fields to correct model properties', () => {
        const result = questionBasicMapper(validDto as any);
        expect(result).toBeInstanceOf(QuestionBasic);
        expect(result).toMatchObject({ id: 1, order: 2, score: 10, penalty: 5, required: true, questionType: 'FFQ' });
    });

    it('throws on DTO mismatch — id is not a number', () => {
        expect(() => questionBasicMapper({ ...validDto, id: 'abc' } as any)).toThrow();
    });

    it('maps score and penalty as 0 when points and penalty default to 0', () => {
        const result = questionBasicMapper({ ...validDto, points: 0, penalty: 0 } as any);
        expect(result.score).toBe(0);
        expect(result.penalty).toBe(0);
    });
});

describe('questionBasicArrayMapper', () => {
    it('maps array and returns empty array for empty input', () => {
        expect(questionBasicArrayMapper([])).toEqual([]);
        const results = questionBasicArrayMapper([validDto, { ...validDto, id: 2 }] as any);
        expect(results).toHaveLength(2);
        expect(results[1].id).toBe(2);
    });
});
