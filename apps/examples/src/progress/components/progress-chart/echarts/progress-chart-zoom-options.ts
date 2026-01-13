import { DataZoomComponentOption } from 'echarts';

const horizonalTimeline: DataZoomComponentOption = {
    type: 'slider',
    xAxisIndex: 0,
    filterMode: 'none',
    height: 25,
    bottom: 10,
    start: 0,
    end: 100,
    handleSize: '80%',
    showDetail: true,
    labelFormatter: (value: number) => {
        const date = new Date(value);
        return date.toLocaleTimeString();
    },
};

const horizontalMouseNavigation: DataZoomComponentOption = {
    type: 'inside',
    xAxisIndex: 0,
    filterMode: 'none',
    zoomOnMouseWheel: false,
    moveOnMouseWheel: true,
    moveOnMouseMove: false,
};

function buildVerticalScroll(
    maxVisibleEntries,
    entryCount,
): DataZoomComponentOption {
    return {
        type: 'slider',
        yAxisIndex: 0,
        filterMode: 'empty',
        width: 0,
        right: 15,
        startValue: 0, // First trainee (now at top)
        endValue: Math.min(maxVisibleEntries - 1, entryCount - 1),
        handleSize: '80%',
        showDetail: false,
        zoomLock: true,
    };
}

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

export const ProgressChartZoomOptions = {
    horizonalTimeline,
    horizontalMouseNavigation,
    buildVerticalScroll,
    verticalMouseNavigation,
};
