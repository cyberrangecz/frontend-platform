import { DataZoomComponentOption, EChartsOption } from 'echarts';
import { format } from 'date-fns';
import { OptionFragment } from '../types/option-fragment.types';

/**
 * Stable ECharts `id` for the horizontal timeline slider. Exported so
 * the renderer can identify this component in `dataZoom` event payloads.
 */
export const HORIZONTAL_SLIDER_DATAZOOM_ID = 'hz-slider';

/**
 * Stable ECharts `id` for the horizontal inside-wheel zoom companion.
 * Exported so the renderer can identify this component in `dataZoom`
 * event payloads.
 */
export const HORIZONTAL_INSIDE_DATAZOOM_ID = 'hz-inside';

/**
 * Stable ECharts `id` for the vertical scrollbar slider. Exported so
 * the renderer can identify this component in `dataZoom` event payloads.
 */
export const VERTICAL_SCROLLBAR_DATAZOOM_ID = 'vt-scrollbar';

/**
 * Stable ECharts `id` for the vertical inside-wheel scroll companion.
 * Exported so the renderer can identify this component in `dataZoom`
 * event payloads.
 */
export const VERTICAL_INSIDE_DATAZOOM_ID = 'vt-inside';

/**
 * Pixel height of the bottom horizontal timeline slider track.
 */
const HORIZONTAL_SLIDER_HEIGHT_PX = 24;

/**
 * Pixel offset of the horizontal slider from the chart's bottom edge.
 */
const HORIZONTAL_SLIDER_BOTTOM_PX = 8;

/**
 * Pixel offset of the vertical scrollbar thumb from the chart's right
 * edge. Matches the grid's right gutter so the thumb floats in the
 * reserved space.
 */
const VERTICAL_SCROLLBAR_RIGHT_PX = 8;

/**
 * Pixel size of the vertical scrollbar's drag handle — the only visible
 * piece of the collapsed-slider scrollbar.
 */
const VERTICAL_SCROLLBAR_MOVE_HANDLE_PX = 12;

/**
 * Inputs to the data-zoom builder.
 *
 * `preservedZoom` / `preservedScrollStartIndex` thread the live chart's
 * current pan/zoom and scroll position back through this builder so a
 * partial update that includes `dataZoom` does not snap the chart back.
 */
export interface DataZoomBuilderInput {
    readonly totalRowCount: number;
    readonly visibleRowCount: number;
    readonly preservedZoom: { readonly startPct: number; readonly endPct: number } | null;
    readonly preservedScrollStartIndex: number | null;
    readonly spansMidnight: boolean;
}

/**
 * Builds the dataZoom fragment.
 *
 * @param input - Row counts and the preserved horizontal/vertical
 *                positions from the live chart, when present.
 * @returns A fragment keyed `'dataZoom'` with the slider + inside-wheel
 *          components for the horizontal axis and optionally the
 *          vertical axis.
 */
export function buildDataZoomFragment(input: DataZoomBuilderInput): OptionFragment {
    const dataZoom: DataZoomComponentOption[] = [
        buildHorizontalSlider(input.preservedZoom, input.spansMidnight),
        buildHorizontalInside(),
    ];

    const maxStartIndex = Math.max(0, input.totalRowCount - input.visibleRowCount);
    const startIndex = Math.max(0, Math.min(input.preservedScrollStartIndex ?? 0, maxStartIndex));
    const endIndex = Math.min(startIndex + input.visibleRowCount - 1, input.totalRowCount - 1);
    dataZoom.push(
        buildVerticalScrollbar(startIndex, endIndex),
        buildVerticalInside(),
    );

    const fragment: Partial<EChartsOption> = {
        dataZoom,
    };

    return {
        key: 'dataZoom',
        fragment,
    };
}

/**
 * Builds the horizontal timeline slider — the user-visible drag band at
 * the bottom of the chart.
 *
 * @param preservedZoom - Current `start`/`end` percentages copied from
 *                        the live chart. `null` defaults to the full
 *                        range.
 * @returns The horizontal slider data-zoom component option.
 */
function buildHorizontalSlider(
    preservedZoom: DataZoomBuilderInput['preservedZoom'],
    spansMidnight: boolean,
): DataZoomComponentOption {
    return {
        id: HORIZONTAL_SLIDER_DATAZOOM_ID,
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'weakFilter',
        start: preservedZoom?.startPct ?? 0,
        end: preservedZoom?.endPct ?? 100,
        bottom: HORIZONTAL_SLIDER_BOTTOM_PX,
        height: HORIZONTAL_SLIDER_HEIGHT_PX,
        labelFormatter: (value: number) => {
            if (Number.isNaN(value) || value < 10 * 60 * 1000) {
                return '';
            }
            return spansMidnight
                ? format(value, 'MMM d') + '\n' + format(value, 'HH:mm:ss')
                : format(value, 'HH:mm:ss');
        },
    };
}

/**
 * Builds the inside-wheel companion for the horizontal axis. Wheel
 * gestures zoom; horizontal panning is handled by dragging the slider
 * track above.
 *
 * @returns The horizontal inside data-zoom component option.
 */
function buildHorizontalInside(): DataZoomComponentOption {
    return {
        id: HORIZONTAL_INSIDE_DATAZOOM_ID,
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'weakFilter',
        zoomOnMouseWheel: 'ctrl' as const,
        moveOnMouseWheel: 'shift' as const,
        moveOnMouseMove: false,
    };
}

/**
 * Builds the vertical scrollbar — a Y-axis `type: 'slider'` collapsed
 * into invisible track + draggable thumb.
 *
 * `width: 0` hides the track; `handleSize: 0` removes resize grips;
 * `zoomLock: true` enforces a fixed window size. `filterMode: 'empty'`
 * is mandatory — `filter` would collapse hidden category slots and
 * break `api.coord` for visible rows.
 *
 * @param startIndex - First visible row index, already clamped by the caller.
 * @param endIndex - Last visible row index, already clamped by the caller.
 * @returns The vertical scrollbar data-zoom component option.
 */
function buildVerticalScrollbar(
    startIndex: number,
    endIndex: number,
): DataZoomComponentOption {
    return {
        id: VERTICAL_SCROLLBAR_DATAZOOM_ID,
        type: 'slider',
        yAxisIndex: 0,
        filterMode: 'empty',
        width: 0,
        right: VERTICAL_SCROLLBAR_RIGHT_PX,
        moveHandleSize: VERTICAL_SCROLLBAR_MOVE_HANDLE_PX,
        handleSize: 0,
        showDetail: false,
        zoomLock: true,
        startValue: startIndex,
        endValue: endIndex,
    };
}

/**
 * Builds the inside-wheel companion for the vertical axis. Wheel
 * gestures pan rows; mouse drag is reserved for the slider thumb so the
 * plot area itself does not capture vertical drags.
 *
 * @returns The vertical inside data-zoom component option.
 */
function buildVerticalInside(): DataZoomComponentOption {
    return {
        id: VERTICAL_INSIDE_DATAZOOM_ID,
        type: 'inside',
        yAxisIndex: 0,
        filterMode: 'empty',
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true,
        moveOnMouseMove: false,
        zoomLock: true,
        throttle: 0,
    };
}
