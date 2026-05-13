import { EventVm } from '../types/event.types';
import { BarKey } from '../types/ids.types';
import { OptionFragment } from '../types/option-fragment.types';

/**
 * Translates the per-bar event groups into ECharts `custom` series — one
 * series per event-icon to be laid over a bar.
 *
 * Per event icon, configures:
 *   - the background circle (color from `EVENT_ICON_CATALOG`)
 *   - the Material Icons icon (foreground color, font family)
 *   - the hover emphasis style (shadow + icon scale)
 *   - the Z-order index per event kind (from `EVENT_Z_ORDER`)
 *   - the tooltip payload (kind + short label + optional detail)
 *
 * The tooltip's discriminating formatter (bar vs event) lives in
 * `tooltip.builder.ts`; this builder only supplies the data payload via
 * the series `data` entry's third slot.
 */
export function buildEventIconsFragment(
    _eventsByBar: ReadonlyMap<BarKey, readonly EventVm[]>,
): OptionFragment | null {
    throw new Error('not implemented');
}
