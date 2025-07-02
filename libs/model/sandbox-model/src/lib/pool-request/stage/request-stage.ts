/**
 * Class representing request stage
 */
import {RequestStageState} from '../../enums/request-stage-state.enum';
import {RequestStageType} from '../../enums/request-stage-type.enum';

export abstract class RequestStage {
    readonly type!: RequestStageType;
    id!: number;
    requestId!: number;
    state!: RequestStageState;
    errorMessage!: string;
    start!: Date;
    end!: Date;

    protected constructor(type: RequestStageType) {
        this.type = type;
    }

    isInQueue(): boolean {
        return this.state === RequestStageState.IN_QUEUE;
    }

    isRunning(): boolean {
        return this.state === RequestStageState.RUNNING;
    }

    hasFailed(): boolean {
        return this.state === RequestStageState.FAILED;
    }

    hasRetry(): boolean {
        return this.state === RequestStageState.RETRY;
    }

    hasFinished(): boolean {
        return this.state === RequestStageState.FINISHED;
    }
}
