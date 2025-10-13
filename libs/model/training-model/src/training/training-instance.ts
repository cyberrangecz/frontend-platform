/**
 * Class representing training instance of a definition.
 */
import {TrainingDefinition} from './training-definition';

export class TrainingInstance {
    id!: number;
    poolId!: number;
    trainingDefinition!: TrainingDefinition;
    startTime!: Date;
    endTime!: Date;
    title!: string;
    accessToken!: string;
    lastEditBy!: string;
    localEnvironment!: boolean;
    sandboxDefinitionId!: number;
    backwardMode!: boolean;
    showStepperBar!: boolean;

    /**
     * True if current time is greater than start time of the training instance, false otherwise
     */
    hasStarted(): boolean {
        return new Date().valueOf() >= this.startTime?.valueOf();
    }

    hasPool(): boolean {
        return this.poolId !== undefined && this.poolId !== null;
    }

    /**
     * True if passed time is greater than start time and smaller than end time of the training instance, false otherwise
     * @param timestamp time to be compared with start time and end time of training instance
     */
    isActive(timestamp: number): boolean {
        return this.startTime.valueOf() < timestamp && this.endTime.valueOf() > timestamp;
    }
}
