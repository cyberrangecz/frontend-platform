import { EChartsOption } from 'echarts';
import { CurrentTimeMarker } from './chart-elements/current-time-marker';
import { LagLegend } from './chart-elements/lag-legend';
import { CombinedProgressChartData, SingleBarData } from './chart-utility-types';
import { DataZoom } from './chart-elements/data-zoom';
import { Tooltip } from './chart-elements/tooltip';
import { Axis } from './chart-elements/axis';
import { BarBuilder } from './chart-elements/progress-chart-bar/bar-builder';

/**
 * Builds all chart series including dummy legend series, bars, and time marker.
 * @param data - Combined chart data
 * @param barsData - Array of all bar data items
 * @param barBuilder - BarBuilder instance for creating bar series
 * @param includeTimeMarker - Whether to include the current time marker (default: true)
 * @returns Partial ECharts option with series array
 */
function buildSeries(
    data: CombinedProgressChartData,
    barsData: SingleBarData[],
    barBuilder: BarBuilder,
    includeTimeMarker = true,
): Partial<EChartsOption> {
    const series = [
        // Dummy series for legend (empty but colored)
        ...LagLegend.buildDummySeries(),

        ...barsData.flatMap((item) => barBuilder.buildBar(item)),
    ];

    // Only add vertical time marker if requested (hidden when all runs finished)
    if (includeTimeMarker) {
        series.push(CurrentTimeMarker(data.endTime));
    }

    return { series };
}

/**
 * Creates data zoom configuration for both horizontal and vertical scrolling.
 * @param traineeCount - Total number of trainees
 * @param maxVisibleEntries - Maximum trainees visible without scrolling
 * @param startValue - Optional initial scroll position
 * @param showDate - Whether to add date information to horizontal axis
 * @returns Partial ECharts option with data zoom configurations
 */
function buildDataZoom(
    showDate: boolean,
    traineeCount: number,
    maxVisibleEntries: number,
    startValue?: number,
): Partial<EChartsOption> {
    return {
        dataZoom: [
            DataZoom.horizonalTimeline(showDate), // Bottom slider (time)
            DataZoom.horizontalMouseNavigation, // Scroll wheel (time)
            DataZoom.buildVerticalScroll(
                maxVisibleEntries,
                traineeCount,
                startValue,
            ), // Right slider (trainees)
            DataZoom.verticalMouseNavigation, // Scroll wheel (trainees)
        ],
    };
}

/**
 * Creates tooltip configuration for chart.
 * @returns Partial ECharts option with tooltip settings
 */
function buildTooltip(): Partial<EChartsOption> {
    return {
        tooltip: Tooltip.tooltip,
    };
}

/**
 * Creates grid configuration defining chart area dimensions.
 * @param gridHeight - Height of the chart grid area
 * @returns Partial ECharts option with grid settings
 */
function buildGrid(gridHeight: number): Partial<EChartsOption> {
    return {
        grid: {
            left: 150,
            right: 80,
            top: 50,
            bottom: 60,
            containLabel: false,
            height: gridHeight,
        },
    };
}

/**
 * Creates legend configuration with lag state counts.
 * @param data - Combined chart data for state counts
 * @returns Partial ECharts option with legend settings
 */
function buildLegend(data: CombinedProgressChartData): Partial<EChartsOption> {
    return {
        legend: LagLegend.buildLegend(data),
    };
}

/**
 * Creates Y-axis configuration for trainee list.
 * @param data - Combined chart data for label building
 * @returns Partial ECharts option with Y-axis settings
 */
function buildYAxis(data: CombinedProgressChartData): Partial<EChartsOption> {
    return {
        yAxis: Axis.buildYAxis(data),
    };
}

/**
 * Creates X-axis configuration for time-based horizontal axis.
 * @param data - Combined chart data for time bounds
 * @param barData - All bar data for calculating max end time
 * @param showDate - Whether to include date in time labels
 * @param allRunsFinished - Whether all training runs are finished (affects time bounds calculation)
 * @returns Partial ECharts option with X-axis settings
 */
function buildXAxis(
    data: CombinedProgressChartData,
    barData: SingleBarData[],
    showDate: boolean,
    allRunsFinished: boolean = false,
): Partial<EChartsOption> {
    return {
        xAxis: Axis.buildXAxis(data, barData, showDate, allRunsFinished),
    };
}

/**
 * Builds complete ECharts configuration with all components.
 * @param data - Combined chart data
 * @param barData - Array of all bar data items
 * @param cacheBarBuilder - BarBuilder instance for creating series
 * @param gridHeight - Height of chart grid area
 * @param visibleEntries - Maximum visible trainees
 * @param showDate - Whether to include date in time labels
 * @param allRunsFinished - Whether all training runs are finished (affects time bounds and marker visibility)
 * @returns Complete ECharts option object
 */
function buildFullChart(
    data: CombinedProgressChartData,
    barData: SingleBarData[],
    cacheBarBuilder: BarBuilder,
    gridHeight: number,
    visibleEntries: number,
    showDate: boolean,
    allRunsFinished: boolean = false,
): EChartsOption {
    return {
        animation: false,
        animationUpdate: false,
        ...buildLegend(data),
        ...buildXAxis(data, barData, showDate, allRunsFinished),
        ...buildYAxis(data),
        ...buildGrid(gridHeight),
        ...buildTooltip(),
        ...buildDataZoom(showDate, data.progress.length, visibleEntries),
        ...buildSeries(data, barData, cacheBarBuilder, !allRunsFinished),
    };
}

export const ProgressChartBuilder = {
    buildFullChart,
    buildDataZoom,
    buildTooltip,
    buildGrid,
    buildLegend,
    buildYAxis,
    buildXAxis,
    buildSeries,
} as const;
