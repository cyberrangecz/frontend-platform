import { BarRow, LevelInfo } from '../types/bar.types';
import { LevelId, TrainingRunId } from '../types/ids.types';
import { StepperItemVm } from '../types/view-model.types';

/**
 * Counts active training-runs per level for the stepper.
 *
 * Reads the unfiltered source-level bar list intentionally — stepper counts
 * reflect the entire instance population, not the currently filtered view.
 *
 * For each level (in level order), counts distinct `trainingRunId` values
 * whose bar on that level has both `completedAt` and `runEndedAt` absent
 * ("currently on that level"). Also computes `locked`: a level is locked
 * when no bar of any kind exists for it in the unfiltered population,
 * meaning no training run has started or completed that level.
 */
export function stepperCounts(
    bars: readonly BarRow[],
    levelsById: ReadonlyMap<LevelId, LevelInfo>,
    levelOrder: readonly LevelId[],
): readonly StepperItemVm[] {
    const activeSets = new Map<LevelId, Set<TrainingRunId>>();
    const startedLevelIds = new Set<LevelId>();

    for (const bar of bars) {
        startedLevelIds.add(bar.levelId);
        if (bar.completedAt == null && bar.runEndedAt == null) {
            let set = activeSets.get(bar.levelId);
            if (set === undefined) {
                set = new Set<TrainingRunId>();
                activeSets.set(bar.levelId, set);
            }
            set.add(bar.trainingRunId);
        }
    }

    const result: StepperItemVm[] = [];

    for (const levelId of levelOrder) {
        const level = levelsById.get(levelId);
        if (level === undefined) {
            continue;
        }
        result.push({
            levelId,
            order: level.order,
            type: level.type,
            title: level.title,
            activeTraineeCount: activeSets.get(levelId)?.size ?? 0,
            locked: !startedLevelIds.has(levelId),
        });
    }

    return result;
}
