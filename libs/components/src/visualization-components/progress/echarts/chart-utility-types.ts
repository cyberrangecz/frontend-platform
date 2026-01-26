import {
    ProgressEvent,
    ProgressState,
    ProgressVisualizationApiData,
    TraineeProgressData,
} from '@crczp/visualization-model';
import { AbstractLevelTypeEnum } from '@crczp/training-model';

/**
 * Core data types for the progress chart.
 *
 * This file defines the bridge between raw API data and chart-specific data structures.
 * All chart builders expect CombinedProgressChartData as input.
 *
 * Key concepts:
 * - CombinedProgressChartData: Raw API + UI state
 * - SingleBarData: One bar (one level for one trainee)
 * - LagState: Color-coded progress status
 * - SortCriteria: Available sort options
 */

/**
 * UI state and derived data affecting chart rendering.
 */
export type ProgressVisualizationCalculatedData = {
    /**
     * Level ID to highlight across all trainees.
     * null = no highlight
     * Non-highlighted bars are dimmed visually
     */
    highlightedLevelIndex: number | null;

    /**
     * Level order number for filtering.
     * When set, chart shows only trainees currently on this level (RUNNING state)
     * null = show all trainees
     */
    currentlySolvedLevelFilter: number | null;

    /**
     * Set of favorited trainee IDs (user-clicked).
     * Favorited trainees appear first and get special styling (pin icon, bold name)
     */
    favoritedTrainees: Set<number>;

    /**
     * Current sort column/criteria
     */
    sortCriteria: SortCriteria;

    /**
     * Sort direction for the selected criteria
     */
    sortDirection: 'asc' | 'desc';

    /**
     * Which lag states to display (from legend selection)
     * Empty set = hide all trainees
     */
    selectedLagStates: Set<LagState>;
};

/**
 * Complete data structure combining API data and UI state for chart rendering.
 */
export type CombinedProgressChartData = ProgressVisualizationApiData &
    ProgressVisualizationCalculatedData;

/**
 * Progress status classification determining bar color and filtering.
 */
export type LagState = 'OK' | 'WARNING' | 'LATE' | 'ABANDONED' | 'UNKNOWN';

/**
 * Count of trainees in each lag state for legend display.
 */
export type LagStateCounts = {
    [K in LagState]: number;
};

/**
 * Available sort criteria for trainee ordering.
 */
export type SortCriteria =
    | 'TRAINEE_NAME'
    | 'CURRENT_LEVEL_ORDER'
    | 'CURRENT_SCORE'
    | 'LAG_TIME'
    | 'LAG_PERCENTAGE'
    | 'TRAINING_RUN_START';

/**
 * Data structure for one horizontal progress bar representing one level for one trainee.
 */
export type SingleBarData = {
    /** Y-axis position (0 = top trainee) */
    traineeIndex: number;

    /** Trainee display name */
    traineeName: string;

    /** Level display name (from level.title) */
    levelName: string;

    /** Level database ID */
    levelId: number;

    /** Level type (Training, Assessment, etc.) for icon */
    levelType: AbstractLevelTypeEnum;

    /** Level start timestamp (ms) */
    startTime: number;

    endTime: number;

    estimatedDurationUnix?: number;

    estimatedDurationMinutes?: number;

    /** Level state: RUNNING, FINISHED, etc. */
    state: ProgressState;

    /** Filtered progress events for this level (wrong answers, hints, etc.) */
    events: ProgressEvent[];

    /** Level score */
    score: number;

    /** This level matches highlightedLevelIndex */
    isHighlighted: boolean;

    /** Some other level is highlighted (dim this bar) */
    isOtherHighlighted: boolean;

    /** Trainee is favorited by user */
    isFavorited: boolean;
};

/**
 * Trainee data extended with favorite status for label rendering.
 */
export type IndexedTrainee = TraineeProgressData & { isFavorited: boolean };
