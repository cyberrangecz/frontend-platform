import { Z } from '@crczp/zod-class';
import { z } from 'zod';
import {formatDate} from '@angular/common';
import {TrainingDefinitionStateEnum} from '../enums/training-definition-state.enum';
import {Level} from '../level/level';

/** Basic read-only training definition data safe for all roles. Subset of {@link TrainingDefinitionWithLevels}. */
export class TrainingDefinitionBasic extends Z.class({
    id: z.number(),
    title: z.string(),
    description: z.string(),
    estimatedDuration: z.number(),
    levels: z.array(z.unknown()),
}) {}

/**
 * Training definition in a system, holding every attribute except the level collection.
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
    /** Number of training instances created from the definition, past ones included. */
    instanceCount = 0;
    /** Version last read from the server; sent back with an update to detect concurrent changes. */
    version = 0;
    title!: string;
    description!: string;
    prerequisites: string[] = [];
    outcomes: string[] = [];
    state!: TrainingDefinitionStateEnum;
    defaultContent = false;
    lastEditBy!: string;
    createdAt!: Date;

    lastEditTimeFormatted!: string;
    private _lastEditTime!: Date;

    /** True while the definition is unreleased and no training instance was created from it. */
    get isEditable(): boolean {
        return this.state === TrainingDefinitionStateEnum.Unreleased && this.instanceCount === 0;
    }

    toString(): number {
        return this.id;
    }
}

/**
 * Training definition extended with the levels it is composed of.
 */
export class TrainingDefinitionWithLevels extends TrainingDefinition {
    levels: Level[] = [];
}
