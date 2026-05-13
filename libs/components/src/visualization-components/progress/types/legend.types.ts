import { LagState } from './lag-state.types';

/**
 * Per-lag-state legend entry. One entry per filterable lag state.
 *
 * `label` is the human-readable text shown in the legend chip
 * (e.g. "On Track (3)"). `count` is supplied separately so the builder
 * can compose the chip without re-parsing the label.
 */
export interface LegendItemVm {
    readonly state: LagState;
    readonly label: string;
    readonly count: number;
}
