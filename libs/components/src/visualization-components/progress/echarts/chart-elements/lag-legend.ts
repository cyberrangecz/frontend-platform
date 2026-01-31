import type { LegendComponentOption, SeriesOption } from 'echarts';
import { CombinedProgressChartData, LagState } from '../chart-utility-types';
import { Filtering } from '../data-manipulation/filtering';
import { LagStateUtils } from '../data-manipulation/lag-state';

/**
 * Base legend configuration for positioning and sizing.
 */
const LEGEND_CONFIG: Partial<LegendComponentOption> = {
    orient: 'horizontal' as const,
    left: 'center',
    top: 20,
    padding: [5, 10],
    itemGap: 20,
    itemWidth: 25,
    itemHeight: 14,
    textStyle: {
        fontSize: 12,
    },
    selector: false,
    selectedMode: 'multiple' as const,
};

/**
 * Color palette for lag states.
 *
 * Matches bar colors exactly for consistency.
 * RGBA for OK/WARNING/LATE/UNKNOWN (semi-transparent).
 * RGB for ABANDONED (solid).
 *
 * Usage: bar fills, legend swatches, dummy series.
 */
export const LAG_STATE_COLORS: Record<LagState, CSSStyleDeclaration['color']> =
    {
        /** Blue - no estimate or not running */
        UNKNOWN: 'rgba(84,112,198)',

        /** Green - on track */
        OK: 'rgba(76,175,80)',

        /** Orange - warning */
        WARNING: 'rgba(255,152,0)',

        /** Red - late */
        LATE: 'rgba(244,67,54)',

        /** Brown - abandoned */
        ABANDONED: 'rgb(92,68,68)',
    };

/**
 * Converts selected lag state set to ECharts legend selection map.
 * Maps enum values to human-readable labels for legend display.
 * @param selectedStates - Set of currently selected lag states
 * @returns Record mapping legend labels to selection state
 */
function buildLagStateSelectedMap(
    selectedStates: Set<LagState>,
): Record<string, boolean> {
    const selected: Record<string, boolean> = {};

    // Iterate label → state mapping
    Object.entries(LagStateUtils.LABEL_TO_STATE).forEach(([name, state]) => {
        selected[name] = selectedStates.has(state);
    });

    return selected;
}

/**
 * Creates complete legend configuration with state counts and colors.
 * Displays all lag states with trainee counts in parentheses.
 * @param data - Combined chart data for calculating state counts
 * @returns ECharts legend component configuration
 */
function buildLegend(data: CombinedProgressChartData): LegendComponentOption {
    // Calculate current lag state distribution
    const counts = Filtering.calculateLagStateCounts(data);
    const selectedStates = data.selectedLagStates;

    /**
     * Legend items: All lag states with human-readable names.
     * No icons (color swatches sufficient).
     */
    const legendData: Array<{ name: string; icon?: string }> =
        LagStateUtils.ALL_LAG_STATES.map((state) => ({
            name: LagStateUtils.STATE_TO_LABEL[state],
        }));

    const selected = buildLagStateSelectedMap(selectedStates);

    return {
        data: legendData,
        selected, // Which items are visible
        ...LEGEND_CONFIG,

        /**
         * Formatter adds count: "On Track (5)"
         * Maps label back to state for count lookup.
         */
        formatter: (name: string) => {
            const state = LagStateUtils.LABEL_TO_STATE[name];
            const count = counts[state] || 0;
            return `${name} (${count})`;
        },
    };
}

/**
 * Generates empty custom series for each lag state to populate legend.
 * ECharts legend only displays items that have associated series.
 * @returns Array of empty series with correct names and colors
 */
function buildDummySeries(): SeriesOption[] {
    const series: SeriesOption[] = [];

    LagStateUtils.ALL_LAG_STATES.forEach((state) => {
        series.push({
            name: LagStateUtils.STATE_TO_LABEL[state], // Legend text
            type: 'custom',
            renderItem: () => null, // Invisible
            data: [], // No data points
            itemStyle: {
                color: LAG_STATE_COLORS[state], // Legend swatch color
            },
        });
    });

    return series;
}

export const LagLegend = {
    buildLegend,
    buildDummySeries,
} as const;
