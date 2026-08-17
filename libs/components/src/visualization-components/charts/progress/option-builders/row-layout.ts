import {
    CHART_BOTTOM_RESERVE_PX,
    CHART_TOP_RESERVE_PX,
    MIN_VISIBLE_ROW_COUNT,
    ROW_HEIGHT_PX,
    VISIBLE_ROW_COUNT,
} from '../config/ui.config';

/**
 * Row geometry the chart is laid out against, derived from the trainee count.
 *
 * `rowSlotCount` and `visibleRowCount` differ once an instance carries more
 * trainees than fit at once: the Y axis holds every trainee as a category
 * while the plot area is sized to the window the vertical dataZoom scrolls.
 * Below {@link MIN_VISIBLE_ROW_COUNT} trainees they differ the other way —
 * both are floored, so the slots beyond the trainee list render as empty rows.
 */
export interface RowLayout {
    /** Y-axis category slots; at least the floor, otherwise one per trainee. */
    readonly rowSlotCount: number;
    /** Rows the plot area shows at once, between the floor and the ceiling. */
    readonly visibleRowCount: number;
    /** Plot-area height covering the visible rows. */
    readonly plotHeightPx: number;
    /** Canvas height covering the plot area and the legend and slider reserves. */
    readonly canvasHeightPx: number;
}

/**
 * Resolves the row geometry for a trainee count.
 *
 * @param traineeCount - Trainees the view-model carries; may be zero.
 * @returns The slot count, visible-row count and the two pixel heights.
 */
export function resolveRowLayout(traineeCount: number): RowLayout {
    const rowSlotCount = Math.max(MIN_VISIBLE_ROW_COUNT, traineeCount);
    const visibleRowCount = Math.min(rowSlotCount, VISIBLE_ROW_COUNT);
    const plotHeightPx = visibleRowCount * ROW_HEIGHT_PX;
    return {
        rowSlotCount,
        visibleRowCount,
        plotHeightPx,
        canvasHeightPx: plotHeightPx + CHART_TOP_RESERVE_PX + CHART_BOTTOM_RESERVE_PX,
    };
}

/** Canvas height of the smallest chart the layout produces. */
export const MIN_CANVAS_HEIGHT_PX = resolveRowLayout(0).canvasHeightPx;
