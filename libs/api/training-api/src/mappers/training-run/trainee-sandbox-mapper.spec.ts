import { describe, expect, it } from 'vitest';
import { TraineeSandboxStateEnum } from '@crczp/training-model';
import { TraineeSandboxMapper } from './trainee-sandbox-mapper';
import { TraineeSandboxDTO } from '../../dto/training-run/trainee-sandbox-dto';

function sandboxDto(
    allocationStages: string[],
    cleanupStages?: string[],
): TraineeSandboxDTO {
    return {
        id: 7,
        pool_id: 3,
        sandbox_id: 'a1b2c3',
        created_at: '2026-10-12T08:00:00Z',
        allocation_request: {
            id: 1,
            allocation_unit_id: 7,
            stages: allocationStages,
        },
        cleanup_request: cleanupStages
            ? { id: 2, allocation_unit_id: 7, stages: cleanupStages }
            : undefined,
        allow_remove: true,
        training_instance_id: 11,
        training_instance_title: 'Junior Hacker',
    };
}

describe('TraineeSandboxMapper', () => {
    it('maps all DTO fields', () => {
        const result = TraineeSandboxMapper.fromDTO(
            sandboxDto(['FINISHED', 'RUNNING', 'IN_QUEUE']),
        );

        expect(result).toMatchObject({
            id: 7,
            poolId: 3,
            sandboxId: 'a1b2c3',
            createdAt: new Date('2026-10-12T08:00:00Z'),
            allocationStages: ['FINISHED', 'RUNNING', 'IN_QUEUE'],
            cleanupStages: undefined,
            removable: true,
            trainingInstanceId: 11,
            trainingInstanceTitle: 'Junior Hacker',
        });
    });

    it('maps a sandbox that no run uses and that is being built', () => {
        const result = TraineeSandboxMapper.fromDTO({
            id: 8,
            pool_id: 3,
            allow_remove: false,
            training_instance_id: null,
            training_instance_title: null,
        } as unknown as TraineeSandboxDTO);

        expect(result.sandboxId).toBeUndefined();
        expect(result.trainingInstanceId).toBeUndefined();
        expect(result.allocationStages).toEqual([]);
        expect(result.state).toBe(TraineeSandboxStateEnum.BUILDING);
    });

    it.each([
        [
            ['IN_QUEUE', 'IN_QUEUE', 'IN_QUEUE'],
            undefined,
            TraineeSandboxStateEnum.BUILDING,
            true,
            true,
            1,
        ],
        [
            ['FINISHED', 'RUNNING', 'IN_QUEUE'],
            undefined,
            TraineeSandboxStateEnum.BUILDING,
            true,
            true,
            2,
        ],
        [
            ['FINISHED', 'FINISHED', 'FINISHED'],
            undefined,
            TraineeSandboxStateEnum.READY,
            false,
            true,
            undefined,
        ],
        [
            ['FINISHED', 'FAILED', 'FAILED'],
            undefined,
            TraineeSandboxStateEnum.BUILD_FAILED,
            false,
            false,
            2,
        ],
        [
            ['FINISHED', 'FINISHED', 'FINISHED'],
            ['RUNNING', 'IN_QUEUE', 'IN_QUEUE'],
            TraineeSandboxStateEnum.REMOVING,
            true,
            true,
            1,
        ],
        [
            ['FINISHED', 'FAILED', 'FAILED'],
            ['FINISHED', 'FINISHED', 'RUNNING'],
            TraineeSandboxStateEnum.REMOVING,
            true,
            true,
            3,
        ],
        [
            ['FINISHED', 'FINISHED', 'FINISHED'],
            ['FAILED', 'FAILED', 'FAILED'],
            TraineeSandboxStateEnum.REMOVAL_FAILED,
            false,
            false,
            1,
        ],
    ])(
        'derives the state of allocation %j with cleanup %j',
        (
            allocationStages,
            cleanupStages,
            state,
            inProgress,
            active,
            currentStage,
        ) => {
            const result = TraineeSandboxMapper.fromDTO(
                sandboxDto(allocationStages, cleanupStages),
            );

            expect(result.state).toBe(state);
            expect(result.inProgress).toBe(inProgress);
            expect(result.active).toBe(active);
            expect(result.currentStage).toBe(currentStage);
            expect(result.stageCount).toBe(3);
        },
    );

    it('maps a missing list to no sandboxes', () => {
        expect(TraineeSandboxMapper.fromDTOs(null)).toEqual([]);
    });
});
