import { EChartsOption, XAXisComponentOption, YAXisComponentOption } from 'echarts';
import { format } from 'date-fns';
import { OptionFragment } from '../types/option-fragment.types';
import { AxisVm, TraineeVm } from '../types/view-model.types';

/**
 * Light gray used for X-axis and Y-axis split lines. Matches the legacy
 * value preserved across the rework — keeps the chart grid unobtrusive.
 */
const SPLIT_LINE_COLOR = '#e0e0e0';

/**
 * Translates the axis + trainee slices into the X-axis and Y-axis option
 * fragment.
 *
 *  - X-axis: `type: 'value'`, millisecond timestamps, `HH:mm:ss` label
 *    format via date-fns; date prefix added when `spansMidnight` is true.
 *  - Y-axis: `type: 'category'`, integer indices `[0, rowCount)`,
 *    `inverse: true`, `interval: 0`, `triggerEvent: true`. The trainee
 *    list drives the rich-text label dictionary in live mode (deferred
 *    to a later batch); skeleton mode passes the placeholder count as
 *    `rowCount` and an empty `trainees` array.
 *
 * `rowCount` must always match the number of rows the bars layer is
 * about to draw — `api.coord([_, rowIndex])` resolves through the Y
 * category axis and silently returns invalid pixels when `rowIndex`
 * has no matching category.
 *
 * @param axis - The axis view-model slice carrying X-axis bounds and the
 *               midnight-spanning toggle.
 * @param rowCount - Total Y-axis category slots. In skeleton mode this is
 *                   `placeholders.length`; in live mode `trainees.length`.
 * @param trainees - The ordered trainee list. Drives the live-mode rich-
 *                   text label dictionary. Empty in skeleton mode.
 * @returns A fragment keyed `'axis'` with `xAxis` and `yAxis` set.
 */
export function buildAxisFragment(
    axis: AxisVm,
    rowCount: number,
    trainees: readonly TraineeVm[],
): OptionFragment {
    const fragment: Partial<EChartsOption> = {
        xAxis: buildXAxis(axis),
        yAxis: buildYAxis(rowCount, trainees),
    };

    return {
        key: 'axis',
        fragment,
    };
}

/**
 * Builds the X-axis option. Value-type axis over millisecond timestamps
 * with `HH:mm:ss` labels (or `MMM d HH:mm:ss` when the window spans
 * midnight). Animation disabled so axis re-bounds repaint instantly.
 *
 * @param axis - Axis view-model slice.
 * @returns The X-axis component option.
 */
function buildXAxis(axis: AxisVm): XAXisComponentOption {
    const labelPattern = axis.spansMidnight ? 'MMM d HH:mm:ss' : 'HH:mm:ss';

    return {
        type: 'value',
        min: axis.startMs,
        max: axis.endMs,
        splitLine: {
            show: true,
            lineStyle: {
                color: SPLIT_LINE_COLOR,
                width: 1,
                type: 'solid',
            },
        },
        axisLabel: {
            formatter: (value: number | string) =>
                format(new Date(Number(value)), labelPattern),
            showMinLabel: true,
            showMaxLabel: true,
        },
        animation: false,
    };
}

/**
 * Builds the Y-axis option. Category axis indexed by row position; one
 * slot per visible row regardless of mode. The rich-text label
 * dictionary (avatars, names, favourite pin) is deferred to the live-
 * mode option-builders batch — skeleton mode renders blank labels.
 *
 * @param rowCount - Number of category slots to emit.
 * @param trainees - Ordered trainee list. Empty during skeleton mode.
 * @returns The Y-axis component option.
 */
function buildYAxis(
    rowCount: number,
    _trainees: readonly TraineeVm[],
): YAXisComponentOption {
    const data = Array.from({ length: rowCount }, (_unused, index) =>
        String(index),
    );

    return {
        type: 'category',
        data,
        inverse: true,
        splitLine: {
            show: true,
            lineStyle: {
                color: SPLIT_LINE_COLOR,
                width: 1,
                type: 'solid',
            },
        },
        axisLine: { show: true },
        axisTick: { show: true },
        axisLabel: {
            interval: 0,
            formatter: () => '',
        },
        triggerEvent: true,
        animation: false,
    };
}
