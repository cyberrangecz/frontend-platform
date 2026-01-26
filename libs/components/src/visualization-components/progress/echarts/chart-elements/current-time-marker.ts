import { LineSeriesOption } from 'echarts';

/**
 * Creates vertical line marker showing current interpolated time position.
 * Spans full chart height with time label at left edge.
 * @param currentTime - Current timestamp in milliseconds
 * @returns ECharts line series with markLine configuration
 */
function buildCurrentTimeMarker(currentTime: number): LineSeriesOption {
    return {
        type: 'line',
        markLine: {
            symbol: 'none', // No markers at ends
            silent: true, // No interaction/tooltip
            animation: false, // Instant repositioning

            lineStyle: {
                color: '#0b0b0b', // Black line
                width: 2,
                type: 'solid',
            },

            label: {
                /**
                 * Formats current time as readable label (HH:MM).
                 * Shown at start (left) of line.
                 */
                formatter: (_params: any) => {
                    const date = new Date(currentTime);
                    return date.toLocaleTimeString();
                },
                position: 'start', // Label on left side of line
            },

            /**
             * Vertical line at exact currentTime position.
             * Spans full chart height automatically.
             */
            data: [
                {
                    xAxis: currentTime,
                },
            ],
        },
    } satisfies LineSeriesOption;
}

/**
 * Factory function for current time marker.
 *
 * Usage in ProgressChart.build():
 * ```ts
 * CurrentTimeMarker(processedData.calculatedData.interpolatedTime)
 * ```
 *
 * Exported as const function for direct use in series array.
 */
export const CurrentTimeMarker = buildCurrentTimeMarker;
