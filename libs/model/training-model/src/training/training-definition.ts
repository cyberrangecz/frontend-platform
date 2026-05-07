import { Z } from 'zod-class';
import { z } from 'zod';
import {formatDate} from '@angular/common';
import {TrainingDefinitionStateEnum} from '../enums/training-definition-state.enum';
import {Level} from '../level/level';

/** Basic read-only training definition data safe for all roles. Subset of {@link TrainingDefinition}. */
export class TrainingDefinitionBasic extends Z.class({
    id: z.number(),
    title: z.string(),
    description: z.string(),
    estimatedDuration: z.number(),
    state: z.nativeEnum(TrainingDefinitionStateEnum),
    levels: z.array(z.any()),
}) {}

/**
 * Class representing training definition in a system.
 */
export class TrainingDefinition {
    get lastEditTime(): Date {
        return this._lastEditTime;
    }

    set lastEditTime(value: Date) {
        this._lastEditTime = value;
        this.lastEditTimeFormatted = formatDate(value, 'd MMM yyyy H:mm', 'en-US');
    }

    id!: number;
    estimatedDuration!: number;
    title!: string;
    description!: string;
    prerequisites: string[] = [];
    outcomes: string[] = [];
    state!: TrainingDefinitionStateEnum;
    levels: Level[] = []
    defaultContent = false;
    lastEditBy!: string;
    hasReferenceSolution!: boolean;
    createdAt!: Date;

    lastEditTimeFormatted!: string;
    private _lastEditTime!: Date;

    toString(): number {
        return this.id;
    }
}
