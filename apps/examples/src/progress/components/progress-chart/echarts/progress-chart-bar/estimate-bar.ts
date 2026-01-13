import { SingleBarData } from '../progress-chart';
import {
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemReturn,
} from 'echarts';
import { ProgressBarStyleUtils } from './bar-style-utils';

function buildEstimateBar(
    item: SingleBarData,
    baseItemHeight: number,
    api: CustomSeriesRenderItemAPI,
): CustomSeriesRenderItemReturn {
    const estimateEnd = api.coord([item.estimatedEndTime, item.traineeIndex]);
    const estimateStart = api.coord([item.startTime, item.traineeIndex]);
    const width = estimateEnd[0] - estimateStart[0];

    const adjustedBarHeight =
        baseItemHeight * ProgressBarStyleUtils.getScaleFactor(item);

    const x = estimateStart[0];
    const y = estimateStart[1] - adjustedBarHeight / 2;

    return {
        type: 'rect',
        shape: {
            x,
            y,
            width: Math.max(width, 2),
            height: Math.max(adjustedBarHeight, 2),
        },
        style: {
            fill: {
                type: 'pattern',
                image: ProgressBarStyleUtils.getEstimatePattern(item),
                repeat: 'repeat',
            },
        },
    };
}

export const EstimateBar = {
    buildEstimateBar,
};
