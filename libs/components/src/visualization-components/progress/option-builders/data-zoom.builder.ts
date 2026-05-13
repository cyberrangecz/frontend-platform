import { DataZoomComponentOption, EChartsOption } from 'echarts';
import { OptionFragment } from '../types/option-fragment.types';

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
        buildHorizontalSlider(input.preservedZoom),
        buildHorizontalInside(),
    ];

    if (input.totalRowCount > input.visibleRowCount) {
        const scrollStartIndex = input.preservedScrollStartIndex ?? 0;
        dataZoom.push(
            buildVerticalScrollbar(scrollStartIndex, input.visibleRowCount),
            buildVerticalInside(),
        );
    }

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
): DataZoomComponentOption {
    return {
        type: 'slider',
        xAxisIndex: 0,
        start: preservedZoom?.startPct ?? 0,
        end: preservedZoom?.endPct ?? 100,
        bottom: HORIZONTAL_SLIDER_BOTTOM_PX,
        height: HORIZONTAL_SLIDER_HEIGHT_PX,
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
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseWheel: false,
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
 * @param scrollStartIndex - First visible row index in the current
 *                           scroll window.
 * @param visibleRowCount - Number of rows visible without scrolling.
 * @returns The vertical scrollbar data-zoom component option.
 */
function buildVerticalScrollbar(
    scrollStartIndex: number,
    visibleRowCount: number,
): DataZoomComponentOption {
    return {
        type: 'slider',
        yAxisIndex: 0,
        filterMode: 'empty',
        width: 0,
        right: VERTICAL_SCROLLBAR_RIGHT_PX,
        moveHandleSize: VERTICAL_SCROLLBAR_MOVE_HANDLE_PX,
        handleSize: 0,
        showDetail: false,
        zoomLock: true,
        startValue: scrollStartIndex,
        endValue: scrollStartIndex + visibleRowCount - 1,
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
        type: 'inside',
        yAxisIndex: 0,
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true,
        moveOnMouseMove: false,
        zoomLock: true,
        throttle: 0,
    };
}
