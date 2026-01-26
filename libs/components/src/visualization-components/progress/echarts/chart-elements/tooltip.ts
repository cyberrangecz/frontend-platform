import { SingleBarData } from '../chart-utility-types';
import { CallbackDataParams } from 'echarts/types/dist/shared';
import { ProgressEvent } from '@crczp/visualization-model';
import { EChartsOption } from 'echarts';

/**
 * Generates HTML tooltip content for progress bar displaying key metrics.
 * @param item - Bar data containing level and trainee information
 * @returns HTML string for tooltip display
 */
function buildBarTooltip(item: SingleBarData): string {
    /**
     * Calculate actual duration in minutes, rounded to 1 decimal.
     * For RUNNING levels: currentTime - startTime
     * For FINISHED: endTime - startTime
     */
    const duration = ((item.endTime - item.startTime) / 1000 / 60).toFixed(1);

    return `
        <strong>${item.traineeName}</strong><br/>
        Level ID: ${item.levelId}<br/>
        Duration: ${duration} min<br/>
        Estimated Duration: ${
            item.estimatedDurationUnix
                ? (item.estimatedDurationUnix / 1000 / 60).toFixed(1) + ' min'
                : 'N/A'
        }<br/>
        State: ${item.state}<br/>
        Score: ${item.score}
    `;
}

/**
 * Universal tooltip formatter handling both event icons and progress bars.
 * Detects data structure type and generates appropriate HTML content.
 * @param params - ECharts tooltip parameters with data payload
 * @returns HTML string for tooltip display or empty string
 */
function tooltipFormatter(params: CallbackDataParams) {
    const data = params.data;

    // Event icons have array data with payload in index 2
    if (Array.isArray(data) && data.length >= 3) {
        const payload = data[2];
        if (payload['event']) {
            const traineeName: string = payload['traineeName'];
            const levelName: string = payload['levelName'];
            const event: ProgressEvent = payload['event'];

            /**
             * Format event timestamp as HH:MM:SS
             * Uses locale-aware formatting with fixed 2-digit fields
             */
            const eventTime = new Date(event.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });

            return `<strong>${event.description.trim()}</strong><br/>Level: ${levelName}<br/>Trainee: ${traineeName}<br/>${eventTime}`;
        }
    }

    // Default: bar tooltip
    return buildBarTooltip(data as SingleBarData);
}

/**
 * ECharts tooltip configuration with custom HTML formatter.
 */
const tooltip: EChartsOption['tooltip'] = {
    trigger: 'item',
    borderColor: 'transparent',
    formatter: tooltipFormatter,
};

export const Tooltip = {
    tooltip,
} as const;
