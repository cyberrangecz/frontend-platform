/**
 * Parent class of all level types
 */
import { AbstractLevelTypeEnum } from '../enums/abstract-level-type.enum';
import { InfoLevel } from './info-level';
import { AccessLevel } from './access-level';
import { TrainingLevel } from './training-level';
import { AssessmentLevel } from './assessment-level';

export abstract class Level {
    id!: number;
    title!: string;
    order!: number;
    estimatedDuration!: number;
    minimalPossibleSolveTime!: number;
    maxScore!: number;
    valid = true;
    type!: AbstractLevelTypeEnum;
    isUnsaved!: boolean;

    get isLoaded(): boolean {
        return (
            (this as unknown as InfoLevel | TrainingLevel).content !==
                undefined ||
            (this as unknown as AccessLevel).cloudContent !== undefined ||
            (this as unknown as AccessLevel).localContent !== undefined ||
            (this as unknown as AssessmentLevel).instructions !== undefined
        );
    }
}
