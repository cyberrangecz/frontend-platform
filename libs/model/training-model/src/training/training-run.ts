import {TrainingRunStateEnum} from '../enums/training-run-state.enum';
import {Level} from '../level/level';
import {Phase} from '../phase/phase';
import {TrainingUser} from "../user-ref/training-user";

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
