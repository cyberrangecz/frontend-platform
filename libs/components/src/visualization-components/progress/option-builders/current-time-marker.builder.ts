import { OptionFragment } from '../types/option-fragment.types';

/**
 * Translates the current-time scalar plus the visibility flag into the
 * empty-line-series-plus-markLine fragment.
 *
 * The empty-line-series trick lives here: a `type: 'line'` series with
 * `data: []` hosts a `markLine` whose only entry is `{ xAxis: currentTimeMs }`.
 * The line series itself draws nothing; only the markLine renders the
 * vertical at the current time.
 *
 * The label on the left side formats the current time as `HH:mm:ss`.
 * When `show` is false (all training runs finished), the markLine is
 * omitted entirely.
 */
export function buildCurrentTimeMarkerFragment(
    _currentTimeMs: number,
    _show: boolean,
): OptionFragment | null {
    throw new Error('not implemented');
}
