import { describe, expect, it } from 'vitest';
import { SandboxWaitReasonEnum } from '@crczp/training-model';
import { AccessLinearRunMapper } from './access-linear-run-mapper';
import { AccessTrainingRunDTO } from '../../dto/training-run/access-training-run-dto';
import { AbstractLevelDTO } from '../../dto/level/abstract-level-dto';
import { BasicLevelInfoDTO } from '../../dto/level/basic-level-info-dto';
import { TraineeSandboxDTO } from '../../dto/training-run/trainee-sandbox-dto';

const INSTANCE_ID = 11;

const BUILDING = ['FINISHED', 'RUNNING', 'IN_QUEUE'];
const BUILT = ['FINISHED', 'FINISHED', 'FINISHED'];
const FAILED = ['FINISHED', 'FAILED', 'FAILED'];

function ownSandbox(
    trainingInstanceId?: number,
    allocationStages = BUILDING,
    cleanupStages?: string[],
): TraineeSandboxDTO {
    return {
        id: 7,
        pool_id: 3,
        allocation_request: {
            id: 1,
            allocation_unit_id: 7,
            stages: allocationStages,
        },
        cleanup_request: cleanupStages
            ? { id: 2, allocation_unit_id: 7, stages: cleanupStages }
            : undefined,
        allow_remove: false,
        training_instance_id: trainingInstanceId,
        training_instance_title: trainingInstanceId
            ? 'Junior Hacker'
            : undefined,
    };
}

function waitingDto(
    allowAllocate: boolean,
    activeSandboxes: TraineeSandboxDTO[],
): AccessTrainingRunDTO {
    return {
        training_run_id: 5,
        instance_id: INSTANCE_ID,
        training_instance_title: 'Junior Hacker',
        managed: false,
        allow_allocate: allowAllocate,
        active_sandboxes: activeSandboxes,
        show_stepper_bar: true,
        sandbox_definition_id: 2,
    } as AccessTrainingRunDTO;
}

describe('AccessLinearRunMapper', () => {
    it('maps a run with a level as one the trainee enters', () => {
        const result = AccessLinearRunMapper.fromDTO({
            training_run_id: 5,
            instance_id: INSTANCE_ID,
            training_instance_title: 'Junior Hacker',
            managed: true,
            sandbox_instance_ref_id: 'a1b2c3',
            sandbox_definition_id: 2,
            abstract_level_dto: {
                id: 21,
                title: 'Welcome',
                order: 0,
                level_type: AbstractLevelDTO.LevelTypeEnum.INFO,
                content: 'Hello',
            } as AbstractLevelDTO,
            info_about_levels: [
                {
                    id: 21,
                    order: 0,
                    title: 'Welcome',
                    level_type: BasicLevelInfoDTO.LevelTypeEnum.INFO,
                },
            ],
            show_stepper_bar: true,
            start_time: new Date('2026-10-12T08:00:00Z'),
            taken_solution: null,
            taken_hints: [],
            local_environment: false,
            backward_mode: false,
        });

        expect(result.waitingForSandbox).toBe(false);
        expect(result.sandboxWaitReason).toBeUndefined();
        expect(result.currentLevelId).toBe(21);
        expect(result.managed).toBe(true);
        expect(result.trainingInstanceTitle).toBe('Junior Hacker');
    });

    it('waits while the run sandbox is being prepared', () => {
        const result = AccessLinearRunMapper.fromDTO(
            waitingDto(false, [ownSandbox(INSTANCE_ID)]),
        );

        expect(result.waitingForSandbox).toBe(true);
        expect(result.levels).toEqual([]);
        expect(result.ownSandboxes).toHaveLength(1);
        expect(result.ownSandboxes[0].trainingInstanceId).toBe(INSTANCE_ID);
        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.PREPARING);
    });

    it('waits for the trainee to remove the run sandbox that failed', () => {
        const result = AccessLinearRunMapper.fromDTO(
            waitingDto(false, [ownSandbox(INSTANCE_ID, FAILED)]),
        );

        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.FAILED);
    });

    it('waits for the trainee to remove the run sandbox whose removal failed', () => {
        const result = AccessLinearRunMapper.fromDTO(
            waitingDto(false, [
                ownSandbox(INSTANCE_ID, BUILT, ['FAILED', 'FAILED', 'FAILED']),
            ]),
        );

        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.FAILED);
    });

    it('waits while the run sandbox is being removed', () => {
        const result = AccessLinearRunMapper.fromDTO(
            waitingDto(false, [
                ownSandbox(INSTANCE_ID, BUILT, [
                    'RUNNING',
                    'IN_QUEUE',
                    'IN_QUEUE',
                ]),
            ]),
        );

        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.REMOVING);
    });

    it('waits for the new run sandbox while the old one is being removed', () => {
        const result = AccessLinearRunMapper.fromDTO(
            waitingDto(false, [
                ownSandbox(INSTANCE_ID, BUILT, [
                    'RUNNING',
                    'IN_QUEUE',
                    'IN_QUEUE',
                ]),
                ownSandbox(INSTANCE_ID, BUILDING),
            ]),
        );

        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.PREPARING);
    });

    it('waits because a sandbox of another training blocks a new one', () => {
        const result = AccessLinearRunMapper.fromDTO(
            waitingDto(false, [ownSandbox(99)]),
        );

        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.BLOCKED);
    });

    it('waits because the run has no sandbox any more', () => {
        const result = AccessLinearRunMapper.fromDTO(
            waitingDto(true, [ownSandbox(99, FAILED)]),
        );

        expect(result.allowAllocate).toBe(true);
        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.MISSING);
    });

    it('tells a trainee whose run has no sandbox that another one blocks a new one', () => {
        const result = AccessLinearRunMapper.fromDTO(
            waitingDto(true, [ownSandbox(99, BUILT)]),
        );

        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.BLOCKED);
    });

    it('waits for the sandbox when the training service could not list any', () => {
        const result = AccessLinearRunMapper.fromDTO(waitingDto(false, []));

        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.PREPARING);
    });

    it('waits without a run when another sandbox blocks the trainee', () => {
        const dto = waitingDto(false, [ownSandbox()]);
        delete dto.training_run_id;

        const result = AccessLinearRunMapper.fromDTO(dto);

        expect(result.trainingRunId).toBeUndefined();
        expect(result.sandboxWaitReason).toBe(SandboxWaitReasonEnum.BLOCKED);
    });
});
