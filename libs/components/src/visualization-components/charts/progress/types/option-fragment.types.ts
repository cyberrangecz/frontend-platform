import { EChartsOption } from 'echarts';

/**
 * The slice identity of an option fragment. Each option-builder returns one
 * fragment tagged with its key. The renderer composes fragments by key into
 * the final option payload.
 *
 * Fragment omission (a `null` return from a builder) signals to the
 * renderer that the underlying view-model slice did not change and ECharts'
 * merge semantics should preserve the previous in-place state.
 */
export type OptionFragmentKey =
    | 'axis'
    | 'bars'
    | 'runCaps'
    | 'eventIcons'
    | 'legend'
    | 'currentTimeMarker'
    | 'tooltip'
    | 'dataZoom'
    | 'grid';

/**
 * Tagged envelope returned by every option-builder. `fragment` is a
 * `Partial<EChartsOption>` whose shape depends on the `key`.
 */
export interface OptionFragment {
    readonly key: OptionFragmentKey;
    readonly fragment: Partial<EChartsOption>;
}
