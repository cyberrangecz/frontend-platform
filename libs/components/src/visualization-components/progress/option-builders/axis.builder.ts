import { AxisVm } from '../types/axis.types';
import { OptionFragment } from '../types/option-fragment.types';
import { TraineeVm } from '../types/trainee.types';

/**
 * Translates the axis + trainee slices into the X-axis and Y-axis option
 * fragment.
 *
 *  - X-axis: `type: 'value'`, millisecond timestamps, `HH:mm:ss` label
 *    format, date prefix when `spansMidnight` is true.
 *  - Y-axis: `type: 'category'`, integer indices, `inverse: true`,
 *    `interval: 0`, `triggerEvent: true`. The rich-text label dictionary
 *    is rebuilt from the trainee list every time this builder is invoked
 *    (avatar dataURL, name color, pin token).
 *
 * Returns `null` when neither slice has changed; the renderer omits the
 * fragment from the dispatch payload so ECharts preserves the existing
 * configuration.
 */
export function buildAxisFragment(
    _axis: AxisVm,
    _trainees: readonly TraineeVm[],
): OptionFragment | null {
    throw new Error('not implemented');
}
