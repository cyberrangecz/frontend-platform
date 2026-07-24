import { describe, it, expect } from 'vitest';
import { TrainingRunBasic, TrainingRunStateEnum } from '@crczp/training-model';
import { trainingRunBasicMapper, trainingRunBasicArrayMapper } from './training-run-basic-mapper';
import { TrainingRunBasicDto } from '../../dto/training-run/training-run-basic-dto';

const startTime = new Date('2024-01-01T10:00:00Z');
const endTime = new Date('2024-06-01T10:00:00Z');

const validDto: InstanceType<typeof TrainingRunBasicDto> = {
    id: 1,
    state: 'RUNNING',
    start_time: startTime,
    end_time: endTime,
    participant_ref: {
        user_ref_id: 99,
        sub: 'jdoe',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'pic',
        mail: 'john.doe@example.cz',
    },
    sandbox_instance_ref_id: 'sandbox-abc-123',
    training_instance_id: 10,
    training_definition_id: 20,
    current_level_id: 5,
    current_level_order: 2,
};

describe('trainingRunBasicMapper', () => {
    it('maps all DTO fields to correct model properties', () => {
        const result = trainingRunBasicMapper(validDto);
        expect(result).toBeInstanceOf(TrainingRunBasic);
        expect(result).toMatchObject({
            id: 1,
            sandboxInstanceId: 'sandbox-abc-123',
            trainingInstanceId: 10,
            trainingDefinitionId: 20,
            startTime,
            endTime,
            currentLevelId: 5,
            currentLevelOrder: 2,
            state: TrainingRunStateEnum.RUNNING,
            participantRef: {
                id: 99,
                login: 'jdoe',
                name: 'John Doe',
                picture: 'pic',
                mail: 'john.doe@example.cz',
            },
        });
    });

    it('throws on DTO mismatch — id is not a number', () => {
        expect(() => trainingRunBasicMapper({ ...validDto, id: 'abc' } as any)).toThrow();
    });

    it('maps nullable fields as null when absent', () => {
        const result = trainingRunBasicMapper({
            ...validDto,
            sandbox_instance_ref_id: null,
            current_level_id: null,
            current_level_order: null,
        });
        expect(result.sandboxInstanceId).toBeNull();
        expect(result.currentLevelId).toBeNull();
        expect(result.currentLevelOrder).toBeNull();
    });
});

describe('trainingRunBasicArrayMapper', () => {
    it('maps array and returns empty array for empty input', () => {
        expect(trainingRunBasicArrayMapper([])).toEqual([]);
        const results = trainingRunBasicArrayMapper([validDto, { ...validDto, id: 2, state: 'FINISHED' }]);
        expect(results).toHaveLength(2);
        expect(results[1].state).toBe(TrainingRunStateEnum.FINISHED);
    });
});
