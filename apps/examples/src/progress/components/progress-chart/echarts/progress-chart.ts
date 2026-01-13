import { EChartsOption, SeriesOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';

import { CombinedProgressChartData } from '../progress-chart.component';
import { BarBuilder } from './progress-chart-bar/progress-bar';
import { ProgressChartMappers } from './progress-chart-mappers';
import { ProgressChartZoomOptions } from './progress-chart-zoom-options';
import { CurrentTimeMarkerChart } from './current-time-marker-chart';
import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { ProgressEvent, ProgressState } from '@crczp/visualization-model';

export type SingleBarData = {
    traineeIndex: number;
    traineeName: string;
    levelName: string;
    levelId: number;
    levelType: AbstractLevelTypeEnum;
    startTime: number;
    endTime: number;
    estimatedEndTime?: number;
    state: ProgressState;
    events: ProgressEvent[];
    score: number;
    isHighlighted: boolean;
    isOtherHighlighted: boolean;
};

function build(data: CombinedProgressChartData): EChartsOption {
    const chartData: SingleBarData[] =
        ProgressChartMappers.extractBarData(data);

    //console.log('Chart Data:', chartData);

    const maxEndTime =
        findMaxEndTime(chartData) ?? data.visualizationData.startTime;

    const barHeight = 24;
    const barMarginTop = 4;
    const barMarginBottom = 4;
    const totalBarHeight = barHeight + barMarginTop + barMarginBottom; // 32px per entry

    // Calculate grid height: each trainee gets exactly 32px (24px bar + 8px margins)
    const totalDataHeight = chartData.length * totalBarHeight;

    const maxVisibleEntries = 15;
    const maxVisibleHeight = maxVisibleEntries * totalBarHeight;
    const gridHeight = Math.min(totalDataHeight, maxVisibleHeight);

    const barBuilder = new BarBuilder(barHeight);

    return {
        tooltip: {
            trigger: 'item',
            formatter: (params: CallbackDataParams) => {
                const data = params.data;
                // Check for event tooltip payload
                if (Array.isArray(data) && data.length >= 3) {
                    const payload = data[2];
                    if (payload['event']) {
                        //const { traineeName, levelName, event } = payload as
                        const traineeName: string = payload['traineeName'];
                        const levelName: string = payload['levelName'];
                        const event: ProgressEvent = payload['event'];
                        const eventTime = new Date(
                            event.timestamp,
                        ).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                        });
                        return `<strong>${event.description.trim()}</strong><br/>Level: ${levelName}<br/>Trainee: ${traineeName}<br/>${eventTime}`;
                    }
                }
                // Fallback to bar tooltip
                return buildBarTooltipContent(params.data as any);
            },
        },
        grid: {
            left: 150,
            right: 80,
            top: 50,
            bottom: 60,
            height: gridHeight,
            containLabel: false,
        },
        xAxis: {
            type: 'value',
            min: data.visualizationData.startTime - 30 * 1000, // 30 seconds padding
            max: maxEndTime,
            axisLabel: {
                formatter: (value: number) => {
                    const date = new Date(value);
                    return date.toLocaleTimeString();
                },
            },
            name: 'Time',
            nameLocation: 'middle',
            nameGap: 30,
        },
        yAxis: {
            type: 'category',
            data: ProgressChartMappers.extractTraineeNames(data),
            inverse: true,
            axisLabel: {
                fontSize: 12,
            },
        },
        dataZoom: [
            ProgressChartZoomOptions.horizonalTimeline,
            ProgressChartZoomOptions.horizontalMouseNavigation,
            ProgressChartZoomOptions.buildVerticalScroll(
                maxVisibleEntries,
                data.visualizationData.progress.length,
            ),
            ProgressChartZoomOptions.verticalMouseNavigation,
        ],
        series: [
            // Bar series with icons
            ...chartData.flatMap(
                (item) => barBuilder.buildBar(item) as SeriesOption[],
            ),
            // Current time marker
            CurrentTimeMarkerChart(data.visualizationData.currentTime),
        ],
    };
}

function findMaxEndTime(chartData: SingleBarData[]): number | null {
    let maxEndTime = null;
    chartData.forEach((item) => {
        if (item.endTime > maxEndTime) {
            maxEndTime = item.endTime;
        }
        if (item.estimatedEndTime && item.estimatedEndTime > maxEndTime) {
            maxEndTime = item.estimatedEndTime;
        }
    });
    return maxEndTime;
}

function buildBarTooltipContent(item: SingleBarData): string {
    const duration = ((item.endTime - item.startTime) / 1000 / 60).toFixed(1);
    return `
        <strong>${item.traineeName}</strong><br/>
        Level ID: ${item.levelId}<br/>
        Duration: ${duration} min<br/>
        Estimated Duration: ${
            item.estimatedEndTime
                ? (
                      (item.estimatedEndTime - item.startTime) /
                      1000 /
                      60
                  ).toFixed(1) + ' min'
                : 'N/A'
        }<br/>
        State: ${item.state}<br/>
        Score: ${item.score}
    `;
}

export const ProgressChart = {
    build,
};
