import { SortDir } from '@sentinel/common/pagination';
import { Utils } from '@crczp/utils';
import {
    ProgressLevelInfo,
    TraineeProgressData,
} from '@crczp/visualization-model';
import { TraineeMappers } from './mapping';
import { LagStateUtils } from './lag-state';
import { CombinedProgressChartData } from '../chart-utility-types';

/**
 * Sorting module for trainee progress data.
 */

/**
 * Compares two numeric values with specified direction.
 * @param condA - First value to compare
 * @param condB - Second value to compare
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sort order: -1, 0, or 1
 */
function compareValues(
    condA: number,
    condB: number,
    direction: SortDir,
): number {
    if (condA === condB) return 0;
    return condA < condB
        ? direction === 'asc'
            ? -1
            : 1
        : direction === 'asc'
          ? 1
          : -1;
}

/**
 * Moves favorited trainees to the top while preserving order.
 * @param data - Array of trainees to sort
 * @param favoritedTrainees - Set of favorited trainee IDs
 * @returns Array with favorited trainees first
 */
function sortByFavorited(
    data: TraineeProgressData[],
    favoritedTrainees: Set<number>,
): TraineeProgressData[] {
    const [favorited, unfavorited] = Utils.Array.split(data, (trainee) =>
        favoritedTrainees.has(trainee.id),
    );
    return [...favorited, ...unfavorited];
}

/**
 * Sorts trainees alphabetically by name (case-insensitive).
 * @param data - Array of trainees to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array of trainees
 */
function sortByTraineeName(
    data: TraineeProgressData[],
    direction: SortDir,
): TraineeProgressData[] {
    return data.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA === nameB) return 0;
        return nameA < nameB
            ? direction === 'asc'
                ? -1
                : 1
            : direction === 'asc'
              ? 1
              : -1;
    });
}

/**
 * Sorts trainees by their current level's order in the training progression.
 * @param data - Array of trainees to sort
 * @param levelData - All available levels with order information
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Trainees sorted by current level order
 */
function sortByCurrentLevelOrder(
    data: TraineeProgressData[],
    levelData: ProgressLevelInfo[],
    direction: SortDir,
): TraineeProgressData[] {
    // Create ordered level ID list
    const levelIdsByOrder = levelData
        .sort((a, b) => a.order - b.order)
        .map((level) => level.id);

    return data.sort((a, b) => {
        const currentLevelA = TraineeMappers.getCurrentLevel(a);
        const currentLevelB = TraineeMappers.getCurrentLevel(b);

        /**
         * Level order index, Infinity if no current level
         * Lower index = earlier level = ahead in training
         */
        const orderA = currentLevelA
            ? levelIdsByOrder.indexOf(currentLevelA.id)
            : Infinity;
        const orderB = currentLevelB
            ? levelIdsByOrder.indexOf(currentLevelB.id)
            : Infinity;

        return compareValues(orderA, orderB, direction);
    });
}

/**
 * Sorts trainees by their total accumulated score across all levels.
 * @param data - Array of trainees to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Trainees sorted by total score
 */
function sortByCurrentScore(
    data: TraineeProgressData[],
    direction: SortDir,
): TraineeProgressData[] {
    return data.sort((a, b) => {
        const scoreA = TraineeMappers.calculateTotalScore(a);
        const scoreB = TraineeMappers.calculateTotalScore(b);
        return compareValues(scoreA, scoreB, direction);
    });
}

/**
 * Sorts trainees by lag metrics (overdue time or percentage).
 * @param data - Array of trainees to sort
 * @param levelData - All levels for estimate calculations
 * @param direction - Sort direction ('asc' or 'desc')
 * @param mode - Lag calculation mode: 'time' or 'percentage'
 * @param endTime - Current time for lag calculations
 * @returns Trainees sorted by specified lag metric
 */
function sortByLag(
    data: TraineeProgressData[],
    levelData: ProgressLevelInfo[],
    direction: SortDir,
    mode: 'time' | 'percentage',
    endTime: number,
): TraineeProgressData[] {
    const levelsById = TraineeMappers.buildLevelsById(levelData);
    return data.sort((a, b) => {
        const currentLevelA = TraineeMappers.getCurrentLevel(a);
        const currentLevelB = TraineeMappers.getCurrentLevel(b);

        const levelInfoA = currentLevelA ? levelsById[currentLevelA.id] : null;
        const levelInfoB = currentLevelB ? levelsById[currentLevelB.id] : null;

        /**
         * Calculate lag metric (time or %)
         * Infinity if no current level or no estimate
         */
        const lagA =
            mode === 'time'
                ? LagStateUtils.calculateLagTime(
                      currentLevelA,
                      levelInfoA,
                      endTime,
                  )
                : LagStateUtils.calculateLagPercentage(
                      currentLevelA,
                      levelInfoA,
                      endTime,
                  );
        const lagB =
            mode === 'time'
                ? LagStateUtils.calculateLagTime(
                      currentLevelB,
                      levelInfoB,
                      endTime,
                  )
                : LagStateUtils.calculateLagPercentage(
                      currentLevelB,
                      levelInfoB,
                      endTime,
                  );

        return compareValues(lagA, lagB, direction);
    });
}

/**
 * Sorts trainees by when they started their training.
 * @param data - Array of trainees to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Trainees sorted by training start time
 */
function sortByTrainingRunStart(
    data: TraineeProgressData[],
    direction: SortDir,
): TraineeProgressData[] {
    return data.sort((a, b) => {
        const startTimeA = TraineeMappers.getTraineeStartTime(a);
        const startTimeB = TraineeMappers.getTraineeStartTime(b);
        return compareValues(startTimeA, startTimeB, direction);
    });
}

/**
 * Applies complete sort chain: alphabetical base → primary criteria → favorites first.
 * @param data - Combined chart data to sort
 * @returns New data object with sorted progress array
 */
function sortData(data: CombinedProgressChartData): CombinedProgressChartData {
    // Step 1: Alphabetical base (ensures stable secondary sorts)
    const nameSortedData = sortByTraineeName(data.progress, 'asc');

    let primarySortSortedData = nameSortedData;

    // Step 2: Primary sort by criteria
    switch (data.sortCriteria) {
        case 'TRAINEE_NAME':
            primarySortSortedData = sortByTraineeName(
                nameSortedData,
                data.sortDirection,
            );
            break;
        case 'CURRENT_LEVEL_ORDER':
            primarySortSortedData = sortByCurrentLevelOrder(
                nameSortedData,
                data.levels,
                data.sortDirection,
            );
            break;
        case 'CURRENT_SCORE':
            primarySortSortedData = sortByCurrentScore(
                nameSortedData,
                data.sortDirection,
            );
            break;
        case 'LAG_TIME':
            primarySortSortedData = sortByLag(
                nameSortedData,
                data.levels,
                data.sortDirection,
                'time',
                data.endTime,
            );
            break;
        case 'LAG_PERCENTAGE':
            primarySortSortedData = sortByLag(
                nameSortedData,
                data.levels,
                data.sortDirection,
                'percentage',
                data.endTime,
            );
            break;
        case 'TRAINING_RUN_START':
            primarySortSortedData = sortByTrainingRunStart(
                nameSortedData,
                data.sortDirection,
            );
            break;
    }

    // Step 3: Favorites always first
    const sortByFavoritedData = sortByFavorited(
        primarySortSortedData,
        data.favoritedTrainees,
    );

    return {
        ...data,
        progress: sortByFavoritedData,
    };
}

export const Sorting = {
    sortData,
} as const;
