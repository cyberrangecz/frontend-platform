import type {
    CustomSeriesOption,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    CustomSeriesRenderItemReturn,
} from 'echarts';
import { EstimateBar } from './estimate-bar';
import { BarStyleUtils } from './bar-style-utils';
import { EventIcons } from './event-icons';
import { SingleBarData } from '../../chart-utility-types';

/**
 * BarBuilder creates ECharts custom series for one progress bar.
 *
 * Each bar generates 3-6 series:
 * 1. Main level bar (rect)
 * 2. Estimated end bar (striped overlay, running only)
 * 3. Level type icon (at start)
 * 4-N. Event icons (one series per event)
 *
 * Series layered by z-index for correct stacking.
 *
 * Used by ProgressChart.build(): barsData.flatMap(barBuilder.buildBar())
 */

/**
 * Creates ECharts custom series for rendering a single progress bar.
 * Generates multiple series layers: main bar, estimate overlay, level icon, and event icons.
 */
export class BarBuilder {
    /**
     * @param baseItemHeight - From BAR_DIMENSIONS.height
     */
    constructor(private baseItemHeight: number) {}

    buildBar(item: SingleBarData): CustomSeriesOption[] {
        const barSeries: CustomSeriesOption[] = [];

        /**
         * Main bar logic:
         * - Finished/no estimate: Only main bar
         * - Running + estimate: Main bar + striped estimate overlay
         */
        if (item.state !== 'RUNNING' || !item.estimatedDurationUnix) {
            barSeries.push(this.createLevelBar(item));
        } else {
            barSeries.push(
                this.createLevelBar(item), // Solid actual progress
                this.createEstimatedEndBar(item), // Striped expected
            );
        }

        // Level type icon always visible (at bar start)
        barSeries.push(this.createLevelTypeIconSeries(item));

        /**
         * Event icons only if not other-highlighted (dimmed).
         * Prevents clutter on dimmed bars.
         */
        if (!item.isOtherHighlighted) {
            barSeries.push(...this.createEventIconSeries(item));
        }

        return barSeries;
    }

    /**
     * Creates custom series for level type icon positioned at bar start.
     * @param item - Bar data containing level type information
     * @returns ECharts custom series configuration for icon rendering
     */
    private createLevelTypeIconSeries(item: SingleBarData): CustomSeriesOption {
        return {
            type: 'custom',
            clip: true, // Clip to grid bounds
            z: 10, // Above bars, below events

            renderItem: (
                params: CustomSeriesRenderItemParams,
                api: CustomSeriesRenderItemAPI,
            ): CustomSeriesRenderItemReturn => {
                /**
                 * Scale icon height with bar (highlight effect).
                 * Uses BarStyleUtils for consistency.
                 */
                const adjustedBarHeight =
                    this.baseItemHeight * BarStyleUtils.getScaleFactor(item);

                return EventIcons.buildLevelTypeIcon(
                    item,
                    adjustedBarHeight,
                    api,
                );
            },

            // Single data point (whole bar)
            data: [item],
            encode: {
                x: [0, 1], // Full X range
                y: 2, // Trainee index
            },
        };
    }

    /**
     * Creates individual series for each progress event icon on the bar.
     * Each event gets its own series with appropriate z-index for stacking.
     * @param item - Bar data containing filtered events
     * @returns Array of ECharts custom series for event icons
     */
    private createEventIconSeries(item: SingleBarData): CustomSeriesOption[] {
        return item.events.map((event) => {
            return {
                type: 'custom',
                clip: true,
                /**
                 * Z-index by event type (hints=17 highest, completions=10 lowest).
                 * Ensures correct stacking order.
                 */
                z: EventIcons.getEventIconZIndex(event.type),

                renderItem: (
                    _params: CustomSeriesRenderItemParams,
                    api: CustomSeriesRenderItemAPI,
                ): CustomSeriesRenderItemReturn => {
                    return EventIcons.buildEventIcon(
                        item,
                        this.baseItemHeight *
                            BarStyleUtils.getScaleFactor(item),
                        api,
                        event,
                    );
                },

                /**
                 * Data point: [x=timestamp, y=traineeIndex, payload]
                 * Payload: traineeName, levelName, event (for tooltip)
                 */
                data: [
                    [
                        event.timestamp,
                        item.traineeIndex,
                        {
                            traineeName: item.traineeName,
                            levelName: item.levelName,
                            event,
                        },
                    ],
                ],
                encode: {
                    x: 0, // timestamp
                    y: 1, // traineeIndex
                },
            };
        });
    }

    /**
     * Creates main progress bar rectangle spanning from start to end time.
     * Height scaled by state, color determined by lag state classification.
     * @param item - Bar data with timing and state information
     * @returns ECharts custom series for main progress bar
     */
    private createLevelBar(item: SingleBarData): CustomSeriesOption {
        return {
            type: 'custom',
            clip: true,

            renderItem: (
                _params: CustomSeriesRenderItemParams,
                api: CustomSeriesRenderItemAPI,
            ): CustomSeriesRenderItemReturn => {
                /**
                 * Convert data coordinates to pixel coordinates.
                 * api.coord([time, traineeIndex]) → [x, y]
                 */
                const startPoint = api.coord([
                    item.startTime,
                    item.traineeIndex,
                ]);
                const endPoint = api.coord([item.endTime, item.traineeIndex]);
                const width = endPoint[0] - startPoint[0];

                const adjustedBarHeight =
                    this.baseItemHeight * BarStyleUtils.getScaleFactor(item);

                /**
                 * Position: left-aligned at startTime, centered vertically.
                 * Min height 2px to avoid zero-height bars.
                 */
                const x = startPoint[0];
                const y = startPoint[1] - adjustedBarHeight / 2;

                return {
                    type: 'group',
                    children: [
                        {
                            type: 'rect',
                            shape: {
                                x: x,
                                y: y,
                                width: width,
                                height: Math.max(adjustedBarHeight, 2),
                            },
                            style: {
                                fill: BarStyleUtils.getFillColor(item),
                            },
                        },
                    ],
                };
            },

            data: [item],
            encode: {
                x: [0, 1], // Full bar X range
                y: 2, // Trainee index
            },
        };
    }

    /**
     * Creates striped overlay showing estimated duration for running levels.
     * Visualizes expected end time compared to actual progress.
     * @param item - Bar data with estimate information for running level
     * @returns ECharts custom series for estimate overlay
     */
    private createEstimatedEndBar(item: SingleBarData): CustomSeriesOption {
        return {
            type: 'custom',
            clip: true,

            renderItem: (
                _params: CustomSeriesRenderItemParams,
                api: CustomSeriesRenderItemAPI,
            ): CustomSeriesRenderItemReturn => {
                return EstimateBar.buildEstimateBar(
                    item,
                    this.baseItemHeight,
                    api,
                );
            },

            data: [item],
            encode: {
                x: [0, 1],
                y: 2,
            },
        };
    }
}
