import { OptionFragment } from '../types/option-fragment.types';

/**
 * Returns the global tooltip option fragment.
 *
 * The discriminating formatter branches on the hovered datum's payload
 * shape:
 *   - bar segment: the datum is a `BarVm`; the formatter renders the bar
 *     tooltip (level title, time range, score, lag state).
 *   - event icon: the datum is an `EventVm`; the formatter renders the
 *     event tooltip. When the user holds shift, hints expand from the
 *     short label to the longer detail (where available).
 *
 * The tooltip configuration itself is mostly static — only the formatter
 * closes over view-model state. Because the formatter does not store the
 * state, this fragment can be emitted once at first paint and omitted
 * thereafter. Behavior is described semantically here; the omission
 * mechanism is a renderer concern.
 */
export function buildTooltipFragment(): OptionFragment | null {
    throw new Error('not implemented');
}
