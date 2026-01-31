import { XAXisComponentOption, YAXisComponentOption } from 'echarts';
import { CombinedProgressChartData, SingleBarData } from '../chart-utility-types';
import { TraineeMappers } from '../data-manipulation/mapping';
import { LabelBuilder } from './labels';
import { TIME_PADDING_MS } from '../../components/progress-chart/progress-chart.component';
import moment from 'moment';

/**
 * Creates X-axis configuration for time-based horizontal axis.
 * Sets dynamic min/max bounds based on actual and estimated end times.
 * @param data - Combined chart data for time bounds
 * @param barData - All bar data for calculating maximum end time
 * @param showDate - Whether to include date in time labels
 * @param allRunsFinished - If true, clamps timeline to actual data bounds only
 * @returns ECharts X-axis configuration
 */
function buildXAxis(
    data: CombinedProgressChartData,
    barData: SingleBarData[],
    showDate: boolean,
    allRunsFinished = false,
): XAXisComponentOption {
    // Calculate max time based on whether all runs are finished
    let maxTime: number;
    if (allRunsFinished) {
        // When all finished, use only actual bar data bounds (ignore interpolated time)
        maxTime = TraineeMappers.getTrainingEndTime(barData) ?? data.startTime;
    } else {
        // When some running, include interpolated current time in max calculation
        maxTime =
            TraineeMappers.getTrainingEndTime(barData, data.endTime) ??
            data.startTime;
    }

    return {
        type: 'value',

        min:
            TraineeMappers.getTrainingStartTime(barData, data.startTime) -
            TIME_PADDING_MS,

        max: maxTime + TIME_PADDING_MS,

        splitLine: {
            show: true,
            lineStyle: {
                color: '#e0e0e0',
                width: 1,
                type: 'solid',
            },
        },

        axisLabel: {
            /**
             * Formats timestamps as readable time (HH:MM or HH:MM:SS).
             * Uses browser locale for 12h/24h preference.
             */
            formatter: (value: number) => {
                return moment(value).format(
                    (showDate ? 'MMM D, ' : '') + 'HH:mm:ss',
                );
            },
            showMinLabel: true,
            showMaxLabel: true,
        },
        name: 'Time',
        nameLocation: 'middle',
        nameGap: 20,
        animation: false, // Disable animation on axis updates
    } satisfies XAXisComponentOption;
}

/**
 * Creates Y-axis configuration for trainee list with rich text labels.
 * Uses inverse ordering with first trainee at top, includes avatars and favorite indicators.
 * @param data - Combined chart data for building label content
 * @returns ECharts Y-axis configuration
 */
function buildYAxis(data: CombinedProgressChartData): YAXisComponentOption {
    // Creates rich text styles and formatter for trainee labels
    const labelBuilder = new LabelBuilder(data);

    return {
        type: 'category',

        /**
         * Y categories = trainee indices [0,1,2,...]
         * Length matches number of trainees (after filtering/sorting)
         */
        data: Array.from({ length: data.progress.length }, (_, i) => i),

        /** First trainee (index 0) at top of chart */
        inverse: true,

        /**
         * Horizontal lines between trainees for readability.
         * Light gray, 1px solid.
         */
        splitLine: {
            show: true,
            lineStyle: {
                color: '#e0e0e0',
                width: 1,
                type: 'solid',
            },
        },

        axisLine: { show: true },
        axisTick: { show: true },

        axisLabel: {
            /**
             * interval: 0 = show label for every category
             * Uses rich text: {avatar0| }{name|John}{pin|}
             */
            interval: 0,
            formatter: labelBuilder.formatter,
            rich: labelBuilder.richTextStyles,
        },

        /**
         * Enable click events on axis labels.
         * Clicks toggle trainee favorites.
         */
        triggerEvent: true,
        animation: false, // Disable animation on axis updates
    } satisfies YAXisComponentOption;
}

export const Axis = {
    buildXAxis,
    buildYAxis,
} as const;
