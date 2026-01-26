import {
    CombinedProgressChartData,
    LagState,
    LagStateCounts,
} from '../chart-utility-types';
import { TraineeMappers } from './mapping';
import { LagStateUtils } from './lag-state';

/**
 * Filtering module for lag state visibility.
 *
 * Two functions:
 * 1. filterByLagState(): Hide trainees not in selected legend states
 * 2. calculateLagStateCounts(): Count trainees per lag state for legend
 *
 * Called early in ProgressChart.build() pipeline: filter → sort → map
 */

/**
 * Filters trainees to show only those currently on a specific level order.
 * @param data - Combined chart data containing filter settings
 * @returns Filtered array of trainee progress data
 */
function filterBySelectedLevel(data: CombinedProgressChartData) {
    if (data.currentlySolvedLevelFilter === null) {
        return data.progress;
    }

    // Find level ID by order
    const levelInfo = data.levels.find(
        (level) => level.order === data.currentlySolvedLevelFilter,
    );
    if (!levelInfo) {
        return data.progress;
    }
    const levelId = levelInfo.id;

    // Filter trainees with RUNNING state on selected level
    const filteredProgress = data.progress.filter((trainee) =>
        trainee.levels.some(
            (level) => level.id === levelId && level.state === 'RUNNING',
        ),
    );

    return filteredProgress;
}

/**
 * Filters trainees based on selected lag states from legend interaction.
 * Optimizes by returning original array if all states are selected.
 * @param data - Combined chart data with selected lag states set
 * @returns Array of trainees matching selected lag state filter
 */
function filterByLagState(data: CombinedProgressChartData) {
    const selectedStates = data.selectedLagStates;

    // Optimization: No filtering needed if all states selected
    if (selectedStates.size === LagStateUtils.ALL_LAG_STATES.length) {
        return data.progress;
    }

    // Fast level lookup by ID
    const levelsById = TraineeMappers.buildLevelsById(data.levels);

    /**
     * Filter trainees based on current level lag state.
     * Only considers RUNNING levels (current progress).
     */
    const filteredProgress = data.progress.filter((trainee) => {
        // Find current (RUNNING) level
        const currentLevel = trainee.levels.find(
            (level) => level.state === 'RUNNING',
        );

        // No current level → hide
        if (!currentLevel) {
            return false;
        }

        // No estimate → UNKNOWN state
        if (!levelsById[currentLevel.id]?.estimatedDuration) {
            return selectedStates.has('UNKNOWN' as LagState);
        }

        // Calculate actual lag state
        const levelInfo = levelsById[currentLevel.id];
        const lagState = LagStateUtils.getLagState(
            currentLevel.state,
            currentLevel.startTime,
            levelInfo.estimatedDuration,
            data.endTime,
        );

        // Show if state selected in legend
        return selectedStates.has(lagState);
    });

    return filteredProgress;
}

/**
 * Counts trainees in each lag state for legend display and statistics.
 * Iterates through all trainees' current levels to determine distribution.
 * @param data - Combined chart data
 * @returns Object with counts for each lag state category
 */
function calculateLagStateCounts(
    data: CombinedProgressChartData,
): LagStateCounts {
    /**
     * Zeroed counts for all states.
     * TypeScript ensures all keys present.
     */
    const counts: LagStateCounts = {
        OK: 0,
        WARNING: 0,
        LATE: 0,
        ABANDONED: 0,
        UNKNOWN: 0,
    };

    const levelsById = TraineeMappers.buildLevelsById(data.levels);

    data.progress.forEach((trainee) => {
        const currentLevel = TraineeMappers.getCurrentLevel(trainee);
        if (!currentLevel) {
            return; // Skip trainees with no current level
        }

        const levelInfo = levelsById[currentLevel.id];
        if (!levelInfo || !levelInfo.estimatedDuration) {
            // Level info not found or no estimate, count as UNKNOWN
            counts['UNKNOWN']++;
            return;
        }

        // Calculate lag state, increment count
        const lagState = LagStateUtils.getLagState(
            currentLevel.state,
            currentLevel.startTime,
            levelInfo.estimatedDuration,
            data.endTime,
        );
        counts[lagState]++;
    });

    return counts;
}

export const Filtering = {
    filterBySelectedLevel,
    filterByLagState,
    calculateLagStateCounts,
} as const;
