import { OptionFragment } from '../types/option-fragment.types';

/**
 * Returns the plot-area grid option fragment — margins and padding for
 * axes, legend, and the bottom timeline slider.
 *
 * Driven by the visible row count and the renderer's measured chart
 * dimensions. The padding values are chosen so the rich-text Y-axis
 * labels (avatar + name + pin) fit cleanly in the left gutter and the
 * vertical scrollbar thumb sits in the right gutter without overlapping
 * the plot area.
 */
export interface GridBuilderInput {
    readonly visibleRowCount: number;
    readonly hostWidth: number;
    readonly hostHeight: number;
}

export function buildGridFragment(_input: GridBuilderInput): OptionFragment | null {
    throw new Error('not implemented');
}
