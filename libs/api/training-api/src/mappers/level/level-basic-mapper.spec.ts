import { describe, it, expect } from 'vitest';
import {
    InfoLevelBasic,
    AccessLevelBasic,
    TrainingLevelBasic,
    AssessmentLevelBasic,
    AbstractLevelTypeEnum,
} from '@crczp/training-model';
import { levelBasicMapper, levelBasicArrayMapper } from './level-basic-mapper';
import { InfoLevelBasicDto } from '../../dto/level/info/info-level-basic-dto';
import { AccessLevelBasicDto } from '../../dto/level/access/access-level-basic-dto';
import { TrainingLevelBasicDto } from '../../dto/level/training/training-level-basic-dto';
import { AssessmentLevelBasicDto } from '../../dto/level/assessment/assessment-level-basic-dto';

const baseLevel = {
    id: 1,
    title: 'Level',
    order: 0,
    estimated_duration: 20,
    max_score: 50,
};

const infoDto: InfoLevelBasicDto = { ...baseLevel, level_type: 'INFO_LEVEL' };
const accessDto: AccessLevelBasicDto = { ...baseLevel, level_type: 'ACCESS_LEVEL' };
const trainingDto: TrainingLevelBasicDto = { ...baseLevel, level_type: 'TRAINING_LEVEL', hints: [], incorrect_answer_limit: 3, solution_penalized: false, mitre_techniques: [] };
const assessmentDto: AssessmentLevelBasicDto = { ...baseLevel, level_type: 'ASSESSMENT_LEVEL', assessment_type: 'TEST', questions: [] };

describe('levelBasicMapper', () => {
    it('routes each type to the correct model class', () => {
        expect(levelBasicMapper(infoDto)).toBeInstanceOf(InfoLevelBasic);
        expect(levelBasicMapper(accessDto)).toBeInstanceOf(AccessLevelBasic);
        expect(levelBasicMapper(trainingDto)).toBeInstanceOf(TrainingLevelBasic);
        expect(levelBasicMapper(assessmentDto)).toBeInstanceOf(AssessmentLevelBasic);

        const info = levelBasicMapper(infoDto);
        expect(info).toMatchObject({ id: 1, title: 'Level', type: AbstractLevelTypeEnum.Info });
    });

    it('throws on DTO mismatch — unknown level_type string', () => {
        expect(() => levelBasicMapper({ ...infoDto, level_type: 'UNKNOWN_LEVEL' } as any)).toThrow();
    });

    it('maps level with empty optional collections (training and assessment)', () => {
        const training = levelBasicMapper(trainingDto) as TrainingLevelBasic;
        expect(training.hints).toEqual([]);
        expect(training.mitreTechniques).toEqual([]);

        const assessment = levelBasicMapper(assessmentDto) as AssessmentLevelBasic;
        expect(assessment.questions).toEqual([]);
    });
});

describe('levelBasicArrayMapper', () => {
    it('maps a mixed array of all four level types', () => {
        const results = levelBasicArrayMapper([infoDto, accessDto, trainingDto, assessmentDto]);
        expect(results).toHaveLength(4);
        expect(results[0]).toBeInstanceOf(InfoLevelBasic);
        expect(results[1]).toBeInstanceOf(AccessLevelBasic);
        expect(results[2]).toBeInstanceOf(TrainingLevelBasic);
        expect(results[3]).toBeInstanceOf(AssessmentLevelBasic);
    });
});
