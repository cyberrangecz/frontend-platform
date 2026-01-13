import { SingleBarData } from '../progress-chart';
import type {
    CustomSeriesOption,
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemParams,
    CustomSeriesRenderItemReturn,
} from 'echarts';
import { EstimateBar } from './estimate-bar';
import { ProgressBarStyleUtils } from './bar-style-utils';
import { EventIcons } from './event-icons';

export class BarBuilder {
    constructor(private baseItemHeight: number) {}

    buildBar(item: SingleBarData): CustomSeriesOption[] {
        const barSeries: CustomSeriesOption[] = [];

        // Add main bar and estimated bar if applicable
        if (item.state !== 'RUNNING' || !item.estimatedEndTime) {
            barSeries.push(this.createLevelBar(item));
        } else {
            barSeries.push(
                this.createLevelBar(item),
                this.createEstimatedEndBar(item),
            );
        }

        // Add level type icon
        barSeries.push(this.createLevelTypeIconSeries(item));

        // Add event icons
        barSeries.push(...this.createEventIconSeries(item));

        return barSeries;
    }

    private createLevelTypeIconSeries(item: SingleBarData): CustomSeriesOption {
        return {
            type: 'custom',
            clip: true,
            z: 10, // High z-index to render above bars
            renderItem: (
                params: CustomSeriesRenderItemParams,
                api: CustomSeriesRenderItemAPI,
            ): CustomSeriesRenderItemReturn => {
                const adjustedBarHeight =
                    this.baseItemHeight *
                    ProgressBarStyleUtils.getScaleFactor(item);

                return EventIcons.buildLevelTypeIcon(
                    item,
                    adjustedBarHeight,
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

    private createEventIconSeries(item: SingleBarData): CustomSeriesOption[] {
        return item.events.map((event) => {
            return {
                type: 'custom',
                clip: true,
                z: EventIcons.getEventIconZIndex(event.type),
                renderItem: (
                    params: CustomSeriesRenderItemParams,
                    api: CustomSeriesRenderItemAPI,
                ): CustomSeriesRenderItemReturn => {
                    return EventIcons.buildEventIcon(api, item, event);
                },
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
                    x: 0,
                    y: 1,
                },
            };
        });
    }

    private createLevelBar(item: SingleBarData): CustomSeriesOption {
        return {
            type: 'custom',
            clip: true,
            renderItem: (
                params: CustomSeriesRenderItemParams,
                api: CustomSeriesRenderItemAPI,
            ): CustomSeriesRenderItemReturn => {
                const startPoint = api.coord([
                    item.startTime,
                    item.traineeIndex,
                ]);
                const endPoint = api.coord([item.endTime, item.traineeIndex]);
                const width = endPoint[0] - startPoint[0];

                const adjustedBarHeight =
                    this.baseItemHeight *
                    ProgressBarStyleUtils.getScaleFactor(item);

                const x = startPoint[0];
                const y = startPoint[1] - adjustedBarHeight / 2;

                const dividerWidth = 2;

                return {
                    type: 'group',
                    children: [
                        {
                            type: 'rect',
                            shape: {
                                x: x + dividerWidth,
                                y: y,
                                width: width - dividerWidth,
                                height: Math.max(adjustedBarHeight, 2),
                            },
                            style: {
                                fill: ProgressBarStyleUtils.getFillColor(item),
                            },
                        },
                        {
                            type: 'rect',
                            shape: {
                                x: x,
                                y: y,
                                width: dividerWidth,
                                height: Math.max(adjustedBarHeight, 2),
                            },
                            style: {
                                fill: 'rgba(62,62,62,0.52)',
                            },
                        },
                    ],
                };
            },
            data: [item],
            encode: {
                x: [0, 1],
                y: 2,
            },
        };
    }

    private createEstimatedEndBar(item: SingleBarData): CustomSeriesOption {
        return {
            type: 'custom',
            clip: true,
            renderItem: (
                params: CustomSeriesRenderItemParams,
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
