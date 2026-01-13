import { LineSeriesOption } from 'echarts';

function buildCurrentTimeMarker(currentTime: number): LineSeriesOption {
    return {
        type: 'line',
        markLine: {
            symbol: 'none',
            silent: true,
            animation: false,
            lineStyle: {
                color: '#0b0b0b',
                width: 2,
                type: 'solid',
            },
            label: {
                formatter: (_params: any) => {
                    const date = new Date(currentTime);
                    return date.toLocaleTimeString();
                },
                position: 'start',
            },
            data: [
                {
                    xAxis: currentTime,
                },
            ],
        },
    } satisfies LineSeriesOption;
}

export const CurrentTimeMarkerChart = buildCurrentTimeMarker;
