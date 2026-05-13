import { EChartsOption } from 'echarts';
import { OptionFragment } from '../types/option-fragment.types';

/**
 * Top padding. Reserves room for the lag-state legend ghost-series row
 * and the stepper-adjacent controls overlay above the plot area.
 */
const GRID_TOP_PX = 56;

/**
 * Bottom padding. Reserves room for the horizontal timeline `dataZoom`
 * slider plus its label.
 */
const GRID_BOTTOM_PX = 64;

/**
 * Left padding. Reserves the avatar + trainee name + favourite pin
 * rich-text gutter. Wide enough that long names do not collide with the
 * Y-axis line.
 */
const GRID_LEFT_PX = 200;

/**
 * Right padding. Reserves the invisible-track vertical scrollbar thumb
 * (data-zoom slider with `width: 0`) so its draggable handle does not
 * overlap the plot area.
 */
const GRID_RIGHT_PX = 40;

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
export function buildGridFragment(_input: GridBuilderInput): OptionFragment {
    const fragment: Partial<EChartsOption> = {
        grid: {
            top: GRID_TOP_PX,
            bottom: GRID_BOTTOM_PX,
            left: GRID_LEFT_PX,
            right: GRID_RIGHT_PX,
            containLabel: false,
        },
    };

    return {
        key: 'grid',
        fragment,
    };
}
