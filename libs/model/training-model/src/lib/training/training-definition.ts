import { formatDate } from '@angular/common';
import { TrainingDefinitionStateEnum } from '../enums/training-definition-state.enum';
import { Level } from '../level/level';
import { Phase } from '../phase/phase';

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
    levels: Level[] | Phase[] = []
    defaultContent: boolean = false;
    lastEditBy!: string;
    hasReferenceSolution!: boolean;
    createdAt!: Date;

    lastEditTimeFormatted!: string;
    private _lastEditTime!: Date;

    toString(): number {
        return this.id;
    }
}
