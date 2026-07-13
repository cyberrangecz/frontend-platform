import { describe, it, expect } from 'vitest';
import {
    InfoLevelBasic,
    AccessLevelBasic,
    TrainingLevelBasic,
    AssessmentLevelBasic,
    AbstractLevelTypeEnum,
} from '@crczp/training-model';
import { levelBasicMapper, levelBasicArrayMapper } from './level-basic-mapper';

const baseLevel = {
    id: 1,
    title: 'Level',
    order: 0,
    estimated_duration: 20,
    minimal_possible_solve_time: 0,
    max_score: 50,
};

const infoDto      = { ...baseLevel, type: 'linear_info' as const,       level_type: 'INFO' };
const accessDto    = { ...baseLevel, type: 'linear_access' as const,     level_type: 'ACCESS' };
const trainingDto  = { ...baseLevel, type: 'linear_training' as const,   level_type: 'TRAINING',   hints: [], incorrect_answer_limit: 3, solution_penalized: false, mitre_techniques: [] };
const assessmentDto = { ...baseLevel, type: 'linear_assessment' as const, level_type: 'ASSESSMENT', assessment_type: 'TEST', questions: [] };

describe('levelBasicMapper', () => {
    it('routes each type to the correct model class', () => {
        expect(levelBasicMapper(infoDto as any)).toBeInstanceOf(InfoLevelBasic);
        expect(levelBasicMapper(accessDto as any)).toBeInstanceOf(AccessLevelBasic);
        expect(levelBasicMapper(trainingDto as any)).toBeInstanceOf(TrainingLevelBasic);
        expect(levelBasicMapper(assessmentDto as any)).toBeInstanceOf(AssessmentLevelBasic);

        const info = levelBasicMapper(infoDto as any);
        expect(info).toMatchObject({ id: 1, title: 'Level', type: AbstractLevelTypeEnum.Info });
    });

    it('throws on DTO mismatch — unknown type string', () => {
        expect(() => levelBasicMapper({ ...infoDto, type: 'linear_unknown' } as any)).toThrow();
    });

    it('maps level with empty optional collections (training and assessment)', () => {
        const training = levelBasicMapper(trainingDto as any) as TrainingLevelBasic;
        expect(training.hints).toEqual([]);
        expect(training.mitreTechniques).toEqual([]);

        const assessment = levelBasicMapper(assessmentDto as any) as AssessmentLevelBasic;
        expect(assessment.questions).toEqual([]);
    });
});

describe('levelBasicArrayMapper', () => {
    it('maps a mixed array of all four level types', () => {
        const results = levelBasicArrayMapper([infoDto, accessDto, trainingDto, assessmentDto] as any);
        expect(results).toHaveLength(4);
        expect(results[0]).toBeInstanceOf(InfoLevelBasic);
        expect(results[1]).toBeInstanceOf(AccessLevelBasic);
        expect(results[2]).toBeInstanceOf(TrainingLevelBasic);
        expect(results[3]).toBeInstanceOf(AssessmentLevelBasic);
    });
});
