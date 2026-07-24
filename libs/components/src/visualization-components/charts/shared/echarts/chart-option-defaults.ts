import type { LinearGradientObject } from 'echarts';
import { TooltipComponentOption, XAXisComponentOption, YAXisComponentOption } from 'echarts';

import { ChartPalette } from './chart-palette';

/**
 * Minimal structural shape of the entries ECharts passes to a tooltip
 * formatter callback. Declared here because ECharts does not publicly export
 * its internal `CallbackDataParams` type; only `name`, `value`, and
 * `dataIndex` are consumed by chart formatters in this project.
 */
export interface TooltipEntry {
    readonly name?: string;
    readonly value?: unknown;
    readonly dataIndex?: number;
}

/** Combined horizontal plot padding (grid left + right) assumed when none is supplied, in pixels. */
const DEFAULT_PLOT_PADDING = 96;

/** Gap kept between a category label and its band edge, in pixels. */
const LABEL_BAND_GAP = 12;

/** Smallest width a truncated category label is ever given, in pixels. */
const MIN_CATEGORY_LABEL_WIDTH = 48;

/** Label width used before the chart width is measured, generous so names show in full. */
const FALLBACK_CATEGORY_LABEL_WIDTH = 160;

/**
 * Computes the truncation width for a category-axis label from the share of the
 * plot its band occupies, so labels render in full when the chart is wide or the
 * categories are few and trim only once the bands grow narrow. Returns a generous
 * fallback until the chart width is known so labels are not trimmed on first paint.
 *
 * @param chartWidth    Measured host width in pixels, or 0 before measurement.
 * @param categoryCount Number of categories sharing the axis.
 * @param plotPadding   Combined horizontal plot padding (grid left + right) in pixels.
 * @returns             Per-label truncation width in pixels.
 */
export function categoryLabelWidth(
    chartWidth: number,
    categoryCount: number,
    plotPadding = DEFAULT_PLOT_PADDING,
): number {
    if (chartWidth <= 0 || categoryCount <= 0) return FALLBACK_CATEGORY_LABEL_WIDTH;
    const plotWidth = Math.max(0, chartWidth - plotPadding);
    return Math.max(MIN_CATEGORY_LABEL_WIDTH, Math.floor(plotWidth / categoryCount) - LABEL_BAND_GAP);
}

/**
 * Builds the vertical linear gradient object used as area-series fill.
 * The top stop is the accent color at high opacity (`d9` ≈ 85 %); the
 * bottom stop fades to near-transparent (`0d` ≈ 5 %).
 *
 * @param color Hex accent color string (e.g. `'#6750a4'`).
 * @returns ECharts linear-gradient descriptor suitable for `areaStyle.color`.
 */
export function verticalGradient(color: string): LinearGradientObject {
    return {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
            { offset: 0, color: color + 'd9' },
            { offset: 1, color: color + '0d' },
        ],
    };
}

/**
 * Returns a base tooltip configuration fragment driven by the resolved
 * theme palette. The returned object sets surface background, no border,
 * standard padding, muted text style, and a dashed accent-colored axis
 * pointer, renders the tooltip on `document.body` so it is never clipped
 * by the panel card's bounds, and disables the move transition so a tooltip
 * re-shown after a live update locks onto the pointer instantly instead of
 * sliding. Chart components spread this and add their own `formatter`.
 *
 * @param palette Resolved theme palette.
 * @returns Partial ECharts `TooltipComponentOption` without a `formatter`.
 */
export function baseTooltipDefaults(
    palette: ChartPalette,
): Omit<TooltipComponentOption, 'formatter'> {
    return {
        trigger: 'axis',
        appendToBody: true,
        transitionDuration: 0,
        backgroundColor: palette.surface,
        borderWidth: 0,
        padding: [8, 12],
        textStyle: { color: palette.mutedText, fontSize: 12 },
        axisPointer: {
            type: 'line',
            lineStyle: { color: palette.accent, width: 1, type: 'dashed' },
        },
    };
}

/**
 * Returns a tooltip configuration fragment for tooltips whose body is produced by
 * `renderRichTooltipHtml`. Builds on {@link baseTooltipDefaults} but clears the
 * native ECharts tooltip chrome (transparent background and border, zero padding,
 * no shadow) so the rendered rich-tooltip surface is the only one shown — making
 * chart tooltips pixel-identical to the CDK-overlay DOM tooltips. Chart components
 * spread this and add their own `formatter` (and `trigger` override if needed).
 *
 * @param palette Resolved theme palette.
 * @returns Partial ECharts `TooltipComponentOption` without a `formatter`.
 */
export function richTooltipDefaults(
    palette: ChartPalette,
): Omit<TooltipComponentOption, 'formatter'> {
    return {
        ...baseTooltipDefaults(palette),
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        padding: 0,
        extraCssText: 'box-shadow:none;',
    };
}

/**
 * Returns a base category (x-axis) configuration fragment driven by the
 * resolved theme palette. Sets axis-line, axis-tick, split-line, and
 * axis-label colors. Chart components spread this and add their own
 * `data`, `triggerEvent`, label truncation settings, etc.
 *
 * @param palette Resolved theme palette.
 * @returns Partial ECharts `XAXisComponentOption`.
 */
export function baseCategoryAxisDefaults(palette: ChartPalette): Partial<XAXisComponentOption> {
    return {
        type: 'category',
        boundaryGap: false,
        axisLine: { lineStyle: { color: palette.gridLine } },
        axisTick: { show: false },
        splitLine: {
            show: true,
            lineStyle: { color: palette.gridLine, type: 'dashed' },
        },
        axisLabel: { color: palette.mutedText },
    };
}

/**
 * Returns a base value (y-axis) configuration fragment driven by the
 * resolved theme palette. Hides axis line and tick marks; applies muted
 * color to labels and split lines. Chart components spread this and add
 * their own `name`, `minInterval`, `splitNumber`, etc.
 *
 * @param palette Resolved theme palette.
 * @returns Partial ECharts `YAXisComponentOption`.
 */
export function baseValueAxisDefaults(palette: ChartPalette): Partial<YAXisComponentOption> {
    return {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: palette.mutedText },
        splitLine: { lineStyle: { color: palette.gridLine } },
    };
}
