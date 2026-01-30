import { DataZoomComponentOption } from 'echarts';
import moment from 'moment';

/**
 * Main horizontal timeline slider at bottom of chart for time range control.
 * Provides visual representation of full time range with draggable zoom controls.
 * @param showDate - Whether to include date in time labels
 * @returns ECharts data zoom configuration for horizontal timeline slider
 */
function horizonalTimeline(showDate: boolean): DataZoomComponentOption {
    return {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none',
        height: 38,
        bottom: 15,
        start: 0,
        end: 100,
        handleSize: '150%',
        moveHandleSize: 12,
        showDetail: true,
        handleLabel: {
            show: true,
        },
        /**
         * Formats slider labels as readable time (HH:MM).
         * Matches X-axis label format.
         */
        labelFormatter: (value: number) => {
            const time = moment(value);
            if (showDate) {
                return time.format('MMMM D') + '\n' + time.format('HH:mm:ss');
            }
            return time.format('HH:mm:ss');
        },
    };
}

/**
 * Mouse drag navigation for horizontal time axis panning.
 * Works independently from visible slider for different interaction modes.
 */
const horizontalMouseNavigation: DataZoomComponentOption = {
    type: 'inside', // Invisible, mouse-driven
    xAxisIndex: 0,
    height: 10,
    handleStyle: {
        borderColor: '#888',
        borderWidth: 1,
    },
    filterMode: 'none',
    zoomOnMouseWheel: false,
    moveOnMouseWheel: false,
    moveOnMouseMove: true, // Drag to pan
};

/**
 * Creates vertical data zoom slider for scrolling through trainees list.
 * Positioned on right side with invisible width, only handle visible.
 * @param maxVisibleEntries - Maximum trainees visible without scrolling
 * @param entryCount - Total number of trainees after filtering/sorting
 * @param startValue - Optional initial scroll position
 * @returns ECharts data zoom configuration for vertical scrolling
 */
function buildVerticalScroll(
    maxVisibleEntries: number,
    entryCount: number,
    startValue?: number,
): DataZoomComponentOption {
    return {
        type: 'slider',
        yAxisIndex: 0, // Controls Y axis (trainees)
        filterMode: 'empty', // Don't hide data, just scroll
        moveHandleSize: 12,
        width: 0, // Invisible width, thin handle only
        right: 15, // Positioned on right edge
        startValue: startValue ?? 0, // Start at first trainee
        endValue: startValue
            ? Math.min(startValue + maxVisibleEntries - 1, entryCount - 1)
            : Math.min(maxVisibleEntries - 1, entryCount - 1),
        handleSize: 0, // No resize handles
        showDetail: false,
        zoomLock: true, // Can't zoom, only scroll
    };
}

/**
 * Mouse wheel navigation for vertical scrolling through trainees list.
 * Provides immediate response with no throttling for smooth scrolling experience.
 */
const verticalMouseNavigation: DataZoomComponentOption = {
    type: 'inside',
    yAxisIndex: 0,
    filterMode: 'empty',
    zoomOnMouseWheel: false,
    moveOnMouseWheel: true,
    moveOnMouseMove: false,
    zoomLock: true,
    throttle: 0,
};

export const DataZoom = {
    horizonalTimeline,
    horizontalMouseNavigation,
    buildVerticalScroll,
    verticalMouseNavigation,
} as const;
