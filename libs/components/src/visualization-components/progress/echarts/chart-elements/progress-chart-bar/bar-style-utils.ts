import { LagState, SingleBarData } from '../../chart-utility-types';
import { LagStateUtils } from '../../data-manipulation/lag-state';

/**
 * Bar styling utilities.
 * Determines color and scale for each progress bar based on state/highlight.
 *
 * Used by BarBuilder to set rect fill and height.
 */

/**
 * Color palette for all bar states.
 *
 * Matches LAG_STATE_COLORS + inactive states.
 *
 * - Lag states: Semi-transparent for depth
 * - INACTIVE: Light blue-gray (dimmed)
 * - INACTIVE_HIGHLIGHTED: Dark gray (visible but secondary)
 */
const BAR_COLORS: Record<
    LagState | 'INACTIVE' | 'INACTIVE_HIGHLIGHTED',
    CSSStyleDeclaration['color']
> = {
    UNKNOWN: 'rgba(84,112,198)', // Blue
    OK: 'rgba(76,175,80)', // Green
    WARNING: 'rgba(255,152,0)', // Orange
    LATE: 'rgba(244,67,54)', // Red
    ABANDONED: 'rgb(92,68,68)', // Brown
    INACTIVE: 'rgb(167,200,223)', // Light blue-gray
    INACTIVE_HIGHLIGHTED: 'rgb(106,106,106)', // Dark gray
};

/**
 * Height scale factors for visual hierarchy.
 *
 * - active: 1.1x = Running levels slightly taller
 * - inactive: 0.6x = Dimmed levels shorter
 * - default: 1x = Normal FINISHED levels
 *
 * Creates clear visual distinction without overwhelming chart.
 */
const BAR_SCALE = {
    active: 1.1,
    inactive: 0.6,
    default: 1,
} as const;

/**
 * Internal type: All possible bar states for coloring/scaling.
 */
type BarState =
    | 'UNKNOWN'
    | 'OK'
    | 'WARNING'
    | 'LATE'
    | 'ABANDONED'
    | 'INACTIVE'
    | 'INACTIVE_HIGHLIGHTED';

/**
 * Determines visual bar state for color and scaling calculations.
 * Applies priority logic: highlighting overrides lag state for visual emphasis.
 * @param item - Bar data containing state and highlighting information
 * @returns Visual state category for styling
 */
function getBarState(item: SingleBarData): BarState {
    // Non-running levels are inactive
    if (item.state !== 'RUNNING') {
        return item.isHighlighted ? 'INACTIVE_HIGHLIGHTED' : 'INACTIVE';
    }

    // Dim if other level highlighted
    if (item.isOtherHighlighted) {
        return 'INACTIVE';
    }

    // Running level → calculate lag state
    return LagStateUtils.getLagState(
        item.state,
        item.startTime,
        item.estimatedDurationMinutes || null,
        item.endTime, // Used as currentTime for lag calc
    );
}

/**
 * Returns fill color for bar based on its visual state.
 * @param item - Bar data containing state and highlighting information
 * @returns CSS color value for bar fill
 */
function getFillColor(item: SingleBarData): string {
    const state = getBarState(item);
    return BAR_COLORS[state];
}

/**
 * Calculates height scaling factor for visual hierarchy and emphasis.
 * @param item - Bar data containing state and highlighting information
 * @returns Scale multiplier between 0.6 and 1.1
 */
function getScaleFactor(item: SingleBarData): number {
    if (
        item.isOtherHighlighted ||
        (item.isHighlighted && item.state !== 'RUNNING')
    ) {
        return BAR_SCALE.inactive;
    } else if (item.state === 'RUNNING') {
        return BAR_SCALE.active;
    } else {
        return BAR_SCALE.default;
    }
}

export const BarStyleUtils = {
    getBarState,
    getFillColor,
    getScaleFactor,
} as const;
