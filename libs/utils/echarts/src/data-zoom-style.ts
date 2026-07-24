import type { DataZoomComponentOption } from 'echarts';

/**
 * Width of the vertical scrollbar track in pixels, matching the theme's `0.6em`
 * webkit scrollbar.
 */
const VERTICAL_SCROLLBAR_WIDTH_PX = 10;

/** Right inset of the vertical scrollbar track from the chart edge, in pixels. */
const VERTICAL_SCROLLBAR_RIGHT_PX = 8;

/**
 * Corner radius of the vertical scrollbar in pixels, matching the theme's
 * `.round-scrollbar` `1rem`; clamps to a pill on the narrow track.
 */
const VERTICAL_SCROLLBAR_BORDER_RADIUS_PX = 16;

/** Hides the data-shape silhouette over the unselected track, leaving it plain. */
const HIDDEN_DATA_MARKER = {
    lineStyle: { opacity: 0 },
    areaStyle: { opacity: 0 },
} as const;

/** Bright white data-shape silhouette drawn over the thumb, kept legible on the dark fill. */
const THUMB_DATA_MARKER = {
    lineStyle: { color: '#ffffff', width: 1.5, opacity: 1 },
    areaStyle: { color: '#ffffff', opacity: 0.2 },
} as const;

/** Two-hex-digit alpha suffix applied to the horizontal slider's neutral track. */
const HORIZONTAL_TRACK_ALPHA = '4d';

/** Two-hex-digit alpha suffix applied to the horizontal slider's accent selected-window fill. */
const HORIZONTAL_WINDOW_ALPHA = '38';

/** Pixel height of the horizontal slider track shared by every horizontal slider. */
export const HORIZONTAL_SLIDER_HEIGHT_PX = 20;

/**
 * Size of the end grab-handles on horizontal sliders, relative to the track height.
 * ECharts dataZoom-slider `handleSize` defaults to `'100%'`; this is ~15% larger.
 */
export const HORIZONTAL_SLIDER_HANDLE_SIZE = '115%';

/**
 * Appends a two-hex-digit alpha suffix to a six-digit hex color, producing the
 * eight-digit `#rrggbbaa` form. Colors that are not plain six-digit hex are
 * returned unchanged, so a token resolved to a non-hex value never yields an
 * invalid string.
 *
 * @param hex   A color string; alpha is applied only when it is `#rrggbb`.
 * @param alpha A two-character hex alpha suffix.
 * @returns The color with the alpha suffix appended, or the input unchanged.
 */
function withAlpha(hex: string, alpha: string): string {
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;
}

/**
 * Colors for the pan-locked vertical scrollbar, taken straight from resolved
 * theme tokens. Both are concrete color strings because ECharts renders onto a
 * canvas and cannot resolve CSS custom properties.
 */
export interface VerticalScrollbarColors {
    /** Track color behind the thumb (light primary tone). */
    readonly track: string;
    /** Thumb fill and end-handle color (dark primary tone). */
    readonly thumb: string;
}

/** Row window and track placement for the vertical scrollbar. */
export interface VerticalScrollbarGeometry {
    /** Zero-based index of the topmost visible row, persisted across rebuilds. */
    readonly startIndex: number;
    /** Zero-based index of the bottommost visible row. */
    readonly endIndex: number;
    /** Top inset of the track, in pixels; align with the chart grid top. */
    readonly top?: number;
    /** Bottom inset of the track, in pixels; align with the chart grid bottom. */
    readonly bottom?: number;
    /** Right inset of the track from the chart edge, in pixels. Defaults to 8. */
    readonly right?: number;
    /**
     * Category filtering applied while scrolling. Defaults to `'none'` (value axis
     * stays stable so bar lengths do not rescale). Custom-series charts that index
     * categories absolutely via `api.coord` must pass `'empty'` so hidden slots are
     * preserved rather than collapsed.
     */
    readonly filterMode?: 'none' | 'empty';
}

/**
 * Builds a pan-locked vertical scrollbar `dataZoom` that turns a category axis
 * into a scrollable list with a slim, theme-colored scrollbar: the track takes
 * the light track color and the thumb the dark thumb color, with a white
 * data-shape silhouette drawn over the thumb so it stays visible against the
 * fill. ECharts cannot round the filler rect itself, so the thumb's pill ends
 * come from its two end-handles, styled as same-color circular caps sized to
 * the track width.
 *
 * The window is fixed (`zoomLock: true`); dragging the thumb scrolls the list,
 * and the caller-supplied `startIndex`/`endIndex` make the window survive chart
 * rebuilds instead of snapping back to the top. Mouse-wheel scrolling is wired
 * separately by the caller.
 *
 * @param colors   Resolved track and thumb colors.
 * @param geometry Row window, track insets, and the category filter mode.
 * @returns        A single `slider` dataZoom component option.
 */
export function verticalScrollbarDataZoom(
    colors: VerticalScrollbarColors,
    geometry: VerticalScrollbarGeometry,
): DataZoomComponentOption {
    return {
        type: 'slider',
        yAxisIndex: 0,
        zoomLock: true,
        filterMode: geometry.filterMode ?? 'none',
        startValue: geometry.startIndex,
        endValue: geometry.endIndex,
        top: geometry.top,
        bottom: geometry.bottom,
        right: geometry.right ?? VERTICAL_SCROLLBAR_RIGHT_PX,
        width: VERTICAL_SCROLLBAR_WIDTH_PX,
        borderRadius: VERTICAL_SCROLLBAR_BORDER_RADIUS_PX,
        showDetail: false,
        brushSelect: false,
        handleIcon: 'circle',
        handleSize: '100%',
        handleStyle: {
            color: colors.thumb,
            borderColor: 'transparent',
            borderWidth: 0,
            shadowBlur: 0,
        },
        moveHandleSize: 0,
        backgroundColor: colors.track,
        fillerColor: colors.thumb,
        borderColor: 'transparent',
        dataBackground: HIDDEN_DATA_MARKER,
        selectedDataBackground: THUMB_DATA_MARKER,
    };
}

/**
 * Colors for the horizontal range slider, taken straight from resolved theme
 * tokens. The track and selected-window colors are made translucent inside the
 * style builder; the handle and label colors are used opaque.
 */
export interface HorizontalSliderColors {
    /** Neutral base color of the full track; rendered translucent. */
    readonly track: string;
    /** Accent base color of the selected window; rendered translucent. */
    readonly window: string;
    /** Solid accent color of the drag handles. */
    readonly handle: string;
    /** Color of the detail (axis-value) labels. */
    readonly label: string;
}

/**
 * Builds the style-only fragment for a horizontal range slider in the
 * brand-accent glass treatment: a barely-there translucent neutral track, a
 * translucent accent fill over the selected window, solid accent handles, and
 * muted handle labels shown persistently rather than only while dragging, with
 * both data-shape silhouettes hidden for a clean surface.
 *
 * Returns appearance and shared sizing keys; the caller spreads them onto its
 * own slider shell carrying the structural keys (`type`, `xAxisIndex`, the window
 * via `start`/`end` or `startValue`/`endValue`, `filterMode`, `bottom`, and
 * `labelFormatter`), which differ per chart. The spread must not be followed by
 * an inline `height` override, or the shared value will be lost.
 *
 * @param colors Resolved track, window, handle, and label colors.
 * @returns      A partial `slider` dataZoom option carrying only style keys.
 */
export function horizontalSliderStyle(colors: HorizontalSliderColors): Partial<DataZoomComponentOption> {
    return {
        height: HORIZONTAL_SLIDER_HEIGHT_PX,
        handleSize: HORIZONTAL_SLIDER_HANDLE_SIZE,
        backgroundColor: withAlpha(colors.track, HORIZONTAL_TRACK_ALPHA),
        fillerColor: withAlpha(colors.window, HORIZONTAL_WINDOW_ALPHA),
        borderColor: 'transparent',
        handleStyle: {
            color: colors.handle,
            borderColor: 'transparent',
            borderWidth: 0,
            shadowBlur: 0,
        },
        moveHandleStyle: {
            color: colors.handle,
        },
        handleLabel: { show: true },
        dataBackground: HIDDEN_DATA_MARKER,
        selectedDataBackground: HIDDEN_DATA_MARKER,
        textStyle: {
            color: colors.label,
        },
    };
}
