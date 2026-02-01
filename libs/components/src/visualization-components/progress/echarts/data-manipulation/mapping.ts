import { AbstractLevelTypeEnum } from '@crczp/training-model';
import {
    ProgressEventType,
    ProgressLevelInfo,
    ProgressLevelVisualizationData,
    TraineeProgressData,
} from '@crczp/visualization-model';
import {
    CombinedProgressChartData,
    SingleBarData,
} from '../chart-utility-types';

/**
 * Event types to display as icons on progress bars.
 */
const SHOWN_EVENT_TYPES = {
    [ProgressEventType.WrongAnswer]: true,
    [ProgressEventType.CorrectFlag]: true,
    [ProgressEventType.HintTaken]: true,
    [ProgressEventType.LevelCompleted]: false,
    [ProgressEventType.SolutionDisplayed]: true,
    [ProgressEventType.TrainingRunFinished]: false,
} as const;

/**
 * Utility functions for trainee data extraction and mapping.
 *
 * Used across sorting, filtering, lag calculations, axis building.
 */

/**
 * Returns the currently running level for a trainee.
 * @param trainee - Trainee progress data
 * @returns Current running level or null if none found
 */
function getCurrentLevel(
    trainee: TraineeProgressData,
): ProgressLevelVisualizationData | null {
    return trainee.levels.find((level) => level.state === 'RUNNING') || null;
}

/**
 * Creates a lookup map from level ID to level information.
 * @param levels - Array of level information objects
 * @returns Record mapping level IDs to level info
 */
function buildLevelsById(
    levels: ProgressLevelInfo[],
): Record<number, ProgressLevelInfo> {
    return levels.reduce(
        (acc, level) => {
            acc[level.id] = level;
            return acc;
        },
        {} as Record<number, ProgressLevelInfo>,
    );
}

/**
 * Calculates the total score accumulated across all levels for a trainee.
 * @param trainee - Trainee progress data
 * @returns Total score sum
 */
function calculateTotalScore(trainee: TraineeProgressData): number {
    return trainee.levels.reduce((sum, level) => sum + level.score, 0) || 0;
}

/**
 * Returns the timestamp when the trainee started their first level.
 * @param trainee - Trainee progress data
 * @returns Start time of first level or Infinity if no levels
 */
function getTraineeStartTime(trainee: TraineeProgressData): number {
    return trainee.levels.length > 0 ? trainee.levels[0].startTime : Infinity;
}

/**
 * Finds the earliest start time across all chart bars for timeline calculation.
 * @param startTime - Base start time to fall back to
 * @param chartData - Array of all bar data
 * @returns Earliest start time or provided start time
 */
function getTrainingStartTime(
    chartData: SingleBarData[],
    startTime: number,
): number {
    return Math.min(...chartData.map((item) => item.startTime)) || startTime;
}

/**
 * Calculates the latest end time across all bars for chart timeline bounds.
 * Considers both actual end times and estimated end times for running levels.
 * @param currentTime - Current time fallback
 * @param chartData - Array of all bar data items
 * @returns Latest end time or null
 */
const getTrainingEndTime = (
    chartData: SingleBarData[],
    currentTime = 0,
): number | null => {
    let maxEndTime = 0;
    chartData.forEach((item) => {
        // Actual end time
        if (item.endTime > maxEndTime) {
            maxEndTime = item.endTime;
        }
        // Estimated end time (for running levels)
        if (item.state === 'RUNNING') {
            if (currentTime > maxEndTime) {
                maxEndTime = currentTime;
            }
            if (
                item.startTime + (item.estimatedDurationUnix || 0) >
                maxEndTime
            ) {
                maxEndTime = item.startTime + (item.estimatedDurationUnix || 0);
            }
        }
    });
    return maxEndTime;
};

export const TraineeMappers = {
    getCurrentLevel,
    buildLevelsById,
    calculateTotalScore,
    getTrainingStartTime,
    getTraineeStartTime,
    getTrainingEndTime,
};

/**
 * Transforms filtered and sorted chart data into renderable bar data for ECharts.
 * Maps each trainee's levels to individual bar objects with positioning, styling, and event data.
 * @param data - Combined chart data after filtering and sorting
 * @param levelsById - Lookup map for level metadata (titles, estimates, types)
 * @returns Array of bar data objects ready for rendering
 */
function extractBarData(
    data: CombinedProgressChartData,
    levelsById: Record<number, ProgressLevelInfo>,
): SingleBarData[] {
    const chartData: SingleBarData[] = [];

    data.progress.forEach((trainee, traineeIndex) => {
        trainee.levels.forEach((level) => {
            // Find level info for title/type/estimate
            const levelInfo = levelsById[level.id];

            chartData.push({
                traineeIndex, // Y position
                traineeName: trainee.name,
                levelName: levelInfo?.title ?? `Level ${level.id}`,
                levelId: level.id,
                levelType:
                    levelInfo?.levelType ?? AbstractLevelTypeEnum.Training,
                startTime: level.startTime,

                /**
                 * endTime logic:
                 * - RUNNING: Use endTime (currentTime)
                 * - COMPLETED: Use actual endTime
                 */
                endTime:
                    level.state === 'RUNNING' ? data.endTime : level.endTime,

                /**
                 * estimatedDurationUnix (for striped overlay):
                 * - RUNNING only: minutes * 60 * 1000
                 * - COMPLETED: undefined (no overlay)
                 */
                estimatedDurationUnix:
                    (levelInfo?.estimatedDuration ?? 0) * 60 * 1000,

                estimatedDurationMinutes: levelInfo?.estimatedDuration,

                state: level.state,
                score: level.score,

                /**
                 * Filter events to relevant types only.
                 * Reduces icon clutter on bars.
                 */
                events: level.events.filter(
                    (event) => SHOWN_EVENT_TYPES[event.type],
                ),

                /**
                 * Highlight flags:
                 * - isHighlighted: This level matches highlightedLevelIndex
                 * - isOtherHighlighted: Some other level highlighted (dim this)
                 * - isFavorited: Trainee favorited by user
                 */
                isHighlighted: level.id === data.highlightedLevelIndex,
                isFavorited: data.favoritedTrainees.has(trainee.id),
                isOtherHighlighted:
                    data.highlightedLevelIndex !== null &&
                    level.id !== data.highlightedLevelIndex,
            });
        });
    });

    return chartData;
}

export const Mapping = {
    extractBarData,
} as const;
