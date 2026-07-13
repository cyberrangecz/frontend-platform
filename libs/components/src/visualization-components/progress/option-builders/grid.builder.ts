import { EChartsOption } from 'echarts';
import { CHART_BOTTOM_RESERVE_PX, CHART_TOP_RESERVE_PX, ROW_HEIGHT_PX } from '../config/ui.config';
import { OptionFragment } from '../types/option-fragment.types';

const GRID_TOP_PX = CHART_TOP_RESERVE_PX;
const GRID_BOTTOM_PX = CHART_BOTTOM_RESERVE_PX;

/**
 * Left padding. Reserves the avatar + trainee name + favourite pin
 * rich-text gutter. Wide enough that long names do not collide with the
 * Y-axis line.
 *
 * Exported so that elements positioned imperatively outside setOption
 * (e.g. the zrender current-time marker) can apply the same clip boundary.
 */
export const GRID_LEFT_PX = 200;

/**
 * Right padding. Reserves the invisible-track vertical scrollbar thumb
 * (data-zoom slider with `width: 0`) so its draggable handle does not
 * overlap the plot area.
 *
 * Exported so that elements positioned imperatively outside setOption
 * (e.g. the zrender current-time marker) can apply the same clip boundary.
 */
export const GRID_RIGHT_PX = 40;

/**
 * Inputs to the grid builder.
 */
export interface GridBuilderInput {
    readonly visibleRowCount: number;
    readonly hostWidth: number;
    readonly hostHeight: number;
}

/**
 * Returns the plot-area grid option fragment.
 *
 * `containLabel: false` — left gutter is reserved manually via
 * `GRID_LEFT_PX` so the rich-text Y-axis labels do not resize the plot
 * area on every trainee-list change.
 *
 * @param _input - Renderer-supplied context. Reserved for live-mode
 *                 refinement.
 * @returns A fragment keyed `'grid'` with the plot-area margins set.
 */
export function buildGridFragment(input: GridBuilderInput): OptionFragment {
    const fragment: Partial<EChartsOption> = {
        grid: {
            top: GRID_TOP_PX,
            bottom: GRID_BOTTOM_PX,
            left: GRID_LEFT_PX,
            right: GRID_RIGHT_PX,
            containLabel: false,
            height: input.visibleRowCount * ROW_HEIGHT_PX,
        },
    };

    return {
        key: 'grid',
        fragment,
    };
}
