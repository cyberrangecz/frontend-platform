import { AxisVm } from './axis.types';
import { PlaceholderRowVm } from './skeleton.types';

/**
 * Bootstrap view-model. Painted while the bars source is empty.
 *
 * Carries enough information to draw plausible chrome (axes, current-time
 * marker, frame) plus a fixed list of animated placeholder rows.
 *
 * Trainees, events, stepper, legend, and highlight are intentionally omitted
 * — they are not yet meaningful, and synthesizing them could leak placeholder
 * data into other code paths.
 */
export interface SkeletonViewModel {
    readonly mode: 'skeleton';
    readonly axis: AxisVm;
    readonly placeholders: readonly PlaceholderRowVm[];
    readonly currentTimeMs: number;
    readonly showCurrentTime: boolean;
}
