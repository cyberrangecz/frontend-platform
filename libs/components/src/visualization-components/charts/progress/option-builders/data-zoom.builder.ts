import { DataZoomComponentOption } from 'echarts';
import { horizontalSliderStyle, verticalScrollbarDataZoom } from '@crczp/echarts-utils';
import { OptionFragment } from '../types/option-fragment.types';
import { CHART_BOTTOM_RESERVE_PX, CHART_TOP_RESERVE_PX } from '../config/ui.config';
import { GRID_LEFT_PX, GRID_RIGHT_PX } from './grid.builder';
import { ChartPalette } from '../../shared';
import { AxisTimeScale } from './axis-time-scale';

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
 * Pixel offset of the horizontal slider from the chart's bottom edge.
 */
const HORIZONTAL_SLIDER_BOTTOM_PX = 8;

/**
 * Extra right inset of the horizontal slider beyond the plot's right margin
 * (2rem at the default root font size). Reserves room so the slider's rightmost
 * edge label stays within the chart frame instead of clipping at the boundary.
 */
const HORIZONTAL_SLIDER_LABEL_INSET_PX = 32;

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
    readonly timeScale: AxisTimeScale;
    readonly colors: ChartPalette;
}

/**
 * Builds the dataZoom fragment.
 *
 * @param input - Row counts and the preserved horizontal/vertical
 *                positions from the live chart, when present.
 * @returns A partial option with the `dataZoom` slider + inside-wheel
 *          components for the horizontal axis and optionally the
 *          vertical axis.
 */
export function buildDataZoomFragment(input: DataZoomBuilderInput): OptionFragment {
    const dataZoom: DataZoomComponentOption[] = [
        buildHorizontalSlider(input.preservedZoom, input.timeScale, input.colors),
        buildHorizontalInside(),
    ];

    if (input.totalRowCount > input.visibleRowCount) {
        const maxStartIndex = input.totalRowCount - input.visibleRowCount;
        const startIndex = Math.max(0, Math.min(input.preservedScrollStartIndex ?? 0, maxStartIndex));
        const endIndex = Math.min(startIndex + input.visibleRowCount - 1, input.totalRowCount - 1);
        dataZoom.push(
            buildVerticalScrollbar(startIndex, endIndex, input.colors),
            buildVerticalInside(),
        );
    }

    return { dataZoom };
}

/**
 * Builds the horizontal timeline slider — the user-visible drag band at
 * the bottom of the chart.
 *
 * @param preservedZoom - Current `start`/`end` percentages copied from
 *                        the live chart. `null` defaults to the full
 *                        range.
 * @param timeScale - Active axis time scale supplying the slider label text.
 * @param colors - Resolved theme colors for the brand-accent glass styling.
 * @returns The horizontal slider data-zoom component option.
 */
function buildHorizontalSlider(
    preservedZoom: DataZoomBuilderInput['preservedZoom'],
    timeScale: AxisTimeScale,
    colors: ChartPalette,
): DataZoomComponentOption {
    return {
        ...horizontalSliderStyle({
            track: colors.gridLine,
            window: colors.accent,
            handle: colors.accent,
            label: colors.mutedText,
        }),
        id: HORIZONTAL_SLIDER_DATAZOOM_ID,
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'weakFilter',
        start: preservedZoom?.startPct ?? 0,
        end: preservedZoom?.endPct ?? 100,
        bottom: HORIZONTAL_SLIDER_BOTTOM_PX,
        left: GRID_LEFT_PX,
        right: GRID_RIGHT_PX + HORIZONTAL_SLIDER_LABEL_INSET_PX,
        labelFormatter: (value: number) => timeScale.formatSliderLabel(value),
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
 * Builds the vertical scrollbar — a Y-axis pan-locked slider styled as a slim
 * theme-colored pill via the shared {@link verticalScrollbarDataZoom} helper,
 * with its track aligned to the grid's top and bottom reserves. `filterMode:
 * 'empty'` is mandatory — `filter` would collapse hidden category slots and
 * break `api.coord` for the custom-rendered bar rows.
 *
 * @param startIndex - First visible row index, already clamped by the caller.
 * @param endIndex - Last visible row index, already clamped by the caller.
 * @param colors - Resolved theme colors for the scrollbar track and thumb.
 * @returns The vertical scrollbar data-zoom component option.
 */
function buildVerticalScrollbar(
    startIndex: number,
    endIndex: number,
    colors: ChartPalette,
): DataZoomComponentOption {
    return {
        ...verticalScrollbarDataZoom(
            { track: colors.scrollTrack, thumb: colors.scrollThumb },
            { startIndex, endIndex, top: CHART_TOP_RESERVE_PX, bottom: CHART_BOTTOM_RESERVE_PX, filterMode: 'empty' },
        ),
        id: VERTICAL_SCROLLBAR_DATAZOOM_ID,
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
