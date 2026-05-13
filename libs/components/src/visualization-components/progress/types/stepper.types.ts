import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { LevelId } from './ids.types';

/**
 * Per-stepper-row view-model slice. One entry per level in level order.
 *
 * The active-trainee count reflects the unfiltered instance population —
 * stepper is a navigation control showing the whole picture, not the
 * currently filtered subset.
 */
export interface StepperItemVm {
    readonly levelId: LevelId;
    readonly order: number;
    readonly type: AbstractLevelTypeEnum;
    readonly title: string;
    readonly activeTraineeCount: number;
}
