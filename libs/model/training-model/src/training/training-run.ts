import { TrainingRunStateEnum } from '../enums/training-run-state.enum';
import { Level } from '../level/level';
import { TrainingUser } from '../user-ref/training-user';
import { Z } from 'zod-class';
import { z } from 'zod';

export class TrainingRunBasic extends Z.class({
    id: z.number(),
    sandboxInstanceId: z.string().nullable(),
    trainingInstanceId: z.number(),
    trainingDefinitionId: z.number(),
    startTime: z.date(),
    endTime: z.date(),
    currentLevelId: z.number().nullable(),
    currentLevelOrder: z.number().nullable(),
    state: z.nativeEnum(TrainingRunStateEnum),
}) {}

/**
 * Class representing training run
 */
export class TrainingRun {
    id!: number;
    sandboxInstanceId!: string;
    sandboxInstanceAllocationId!: number;
    trainingInstanceId!: number;
    trainingDefinitionId!: number;
    player!: TrainingUser;
    startTime!: Date;
    endTime!: Date;
    currentLevel!: Level | number;
    eventLogReference!: string;
    state!: TrainingRunStateEnum;
    hasDetectionEvent!: boolean;
    eventLogging!: boolean;
    commandLogging!: boolean;

    isRunning(): boolean {
        return this.state === TrainingRunStateEnum.RUNNING;
    }

    hasPlayer(): boolean {
        return this.player !== undefined && this.player !== null;
    }
}
