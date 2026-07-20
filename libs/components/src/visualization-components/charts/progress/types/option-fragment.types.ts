import { EChartsOption } from 'echarts';

/**
 * A partial ECharts option slice returned by every option-builder.
 * The renderer merges all fragments into one complete option payload.
 */
export type OptionFragment = Partial<EChartsOption>;
