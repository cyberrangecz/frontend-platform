import { describe, it, expect } from 'vitest';
import { TrainingLevelBasic, AbstractLevelTypeEnum } from '@crczp/training-model';
import { trainingLevelBasicMapper, trainingLevelBasicArrayMapper } from './training-level-basic-mapper';
import { TrainingLevelBasicDto } from '../../../dto/level/training/training-level-basic-dto';

const validDto: TrainingLevelBasicDto = {
    id: 1,
    title: 'Training Level',
    order: 3,
    estimated_duration: 30,
    max_score: 100,
    level_type: 'TRAINING_LEVEL',
    hints: [{ id: 10, title: 'Hint One', hint_penalty: 5 }],
    incorrect_answer_limit: 3,
    solution_penalized: true,
    mitre_techniques: [{ id: 20, technique_key: 'T1059' }],
};

describe('trainingLevelBasicMapper', () => {
    it('maps all DTO fields to correct model properties', () => {
        const result = trainingLevelBasicMapper(validDto);
        expect(result).toBeInstanceOf(TrainingLevelBasic);
        expect(result).toMatchObject({
            id: 1,
            title: 'Training Level',
            order: 3,
            estimatedDuration: 30,
            maxScore: 100,
            type: AbstractLevelTypeEnum.Training,
            incorrectAnswerLimit: 3,
            isSolutionPenalized: true,
        });
        expect(result.hints[0]).toMatchObject({ id: 10, title: 'Hint One', penalty: 5 });
        expect(result.mitreTechniques[0]).toMatchObject({ id: 20, techniqueKey: 'T1059' });
    });

    it('throws on DTO mismatch — solution_penalized is not a boolean', () => {
        expect(() => trainingLevelBasicMapper({ ...validDto, solution_penalized: 'yes' } as any)).toThrow();
    });

    it('maps with empty hints and mitre_techniques arrays', () => {
        const result = trainingLevelBasicMapper({ ...validDto, hints: [], mitre_techniques: [] });
        expect(result.hints).toEqual([]);
        expect(result.mitreTechniques).toEqual([]);
    });
});

describe('trainingLevelBasicArrayMapper', () => {
    it('maps array and returns empty array for empty input', () => {
        expect(trainingLevelBasicArrayMapper([])).toEqual([]);
        const results = trainingLevelBasicArrayMapper([validDto, { ...validDto, id: 2 }]);
        expect(results).toHaveLength(2);
        expect(results[1].id).toBe(2);
    });
});
