import { TrainingRunStateEnum } from '../enums/training-run-state.enum';
import { Level } from '../level/level';
import { Trainee } from '../user-ref/trainee';
import { Phase } from '../phase/phase';

/**
 * Class representing training run
 */
export class TrainingRun {
    id!: number;
    sandboxInstanceId!: string;
    sandboxInstanceAllocationId!: number;
    trainingInstanceId!: number;
    trainingDefinitionId!: number;
    player!: Trainee;
    startTime!: Date;
    endTime!: Date;
    currentLevel!: Level | number | Phase;
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
