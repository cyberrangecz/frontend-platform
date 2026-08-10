/**
 * Class representing training instance of a definition.
 */
import {TrainingDefinitionWithLevels} from './training-definition';
import { Z } from 'zod-class';
import { z } from 'zod';

export class TrainingInstanceBasic extends Z.class({
    id: z.number(),
    title: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    trainingDefinitionId: z.number(),
}) {
    declare id: number;
    declare title: string;
    declare startTime: Date;
    declare endTime: Date;
    declare trainingDefinitionId: number;
}

export class TrainingInstance {
    id!: number;
    poolId!: number;
    trainingDefinition!: TrainingDefinitionWithLevels;
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
     *
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
        return (
            this.startTime.valueOf() < timestamp &&
            this.endTime.valueOf() > timestamp
        );
    }
}
