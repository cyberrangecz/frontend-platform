import {
    CustomSeriesRenderItemAPI,
    CustomSeriesRenderItemReturn,
} from 'echarts';
import { LagState, SingleBarData } from '../../chart-utility-types';
import { BarStyleUtils } from './bar-style-utils';

/**
 * Striped overlay showing expected duration on running levels.
 *
 * Rendered ABOVE main bar (same height/scale).
 * Diagonal stripes indicate "expected" vs solid "actual".
 *
 * Darker colors matching lag states.
 * Canvas patterns created once at module load.
 */

/**
 * Darker colors for stripe patterns.
 * Matches lag state colors but more saturated/opaque.
 * Ensures pattern visible over main bar color.
 */
const ESTIMATE_PATTERN_COLORS: Record<
    LagState | 'INACTIVE' | 'INACTIVE_HIGHLIGHTED',
    string
> = {
    OK: '#225e00', // Dark green
    WARNING: '#bc5e00', // Dark orange
    LATE: '#aa0000', // Dark red
    ABANDONED: '#08102b', // Dark brown
    UNKNOWN: '#0c1e8c', // Dark blue
    INACTIVE: '#4d4a4a', // Dark gray
    INACTIVE_HIGHLIGHTED: '#aeaeae', // Medium gray
};

/**
 * Pre-created canvas patterns for each state.
 * 8x8 diagonal stripes.
 * Created once at module load (performance).
 */
const ESTIMATE_PATTERNS_MAP: Record<
    LagState | 'INACTIVE' | 'INACTIVE_HIGHLIGHTED',
    HTMLCanvasElement
> = {
    OK: createStripePattern(ESTIMATE_PATTERN_COLORS.OK),
    WARNING: createStripePattern(ESTIMATE_PATTERN_COLORS.WARNING),
    LATE: createStripePattern(ESTIMATE_PATTERN_COLORS.LATE),
    ABANDONED: createStripePattern(ESTIMATE_PATTERN_COLORS.ABANDONED),
    UNKNOWN: createStripePattern(ESTIMATE_PATTERN_COLORS.UNKNOWN),
    INACTIVE: createStripePattern(ESTIMATE_PATTERN_COLORS.INACTIVE),
    INACTIVE_HIGHLIGHTED: createStripePattern(
        ESTIMATE_PATTERN_COLORS.INACTIVE_HIGHLIGHTED,
    ),
};

/**
 * Generates an 8x8 canvas with diagonal stripe pattern for estimate overlays.
 * Uses multiple line segments to create seamless tiling effect.
 * @param stroke - Color for stripe lines
 * @returns HTML canvas element ready for ECharts pattern fill
 */
function createStripePattern(
    stroke: CSSStyleDeclaration['color'],
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.lineCap = 'butt';

    ctx.beginPath();
    // Main diagonal (extended beyond bounds for seamless repeat)
    ctx.moveTo(-1, -1);
    ctx.lineTo(9, 9);
    // Edge pieces for seamless tiling
    ctx.moveTo(-1, 7);
    ctx.lineTo(1, 9);
    ctx.moveTo(7, -1);
    ctx.lineTo(9, 1);
    ctx.stroke();

    return canvas;
}

/**
 * Renders striped overlay rectangle showing expected duration for running levels.
 * Positioned to overlay the main bar from start time to estimated end time.
 * @param item - Bar data for running level with estimate information
 * @param baseItemHeight - Base height of bars before scaling
 * @param api - ECharts coordinate API for positioning
 * @returns ECharts render item for striped estimate overlay
 */
const buildEstimateBar = (
    item: SingleBarData,
    baseItemHeight: number,
    api: CustomSeriesRenderItemAPI,
): CustomSeriesRenderItemReturn => {
    /**
     * Convert estimate end to pixel coordinates.
     * Width may be negative if ahead of estimate (clamped).
     */
    const estimateEnd = api.coord([
        item.startTime + item.estimatedDurationUnix!,
        item.traineeIndex,
    ]);
    const estimateStart = api.coord([item.startTime, item.traineeIndex]);
    const width = estimateEnd[0] - estimateStart[0];

    const adjustedBarHeight =
        baseItemHeight * BarStyleUtils.getScaleFactor(item);

    const x = estimateStart[0];
    const y = estimateStart[1] - adjustedBarHeight / 2;

    const barState = BarStyleUtils.getBarState(item);
    const pattern = ESTIMATE_PATTERNS_MAP[barState];

    return {
        type: 'rect',
        shape: {
            x,
            y,
            width: Math.max(width, 2), // Min 2px width
            height: Math.max(adjustedBarHeight, 2),
        },
        style: {
            fill: {
                type: 'pattern',
                image: pattern,
                repeat: 'repeat', // Tile pattern across rect
            },
        },
    };
};

export const EstimateBar = {
    buildEstimateBar,
} as const;
