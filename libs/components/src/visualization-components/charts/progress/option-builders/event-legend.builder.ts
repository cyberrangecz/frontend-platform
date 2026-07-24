import { CustomSeriesOption, LegendComponentOption } from 'echarts';
import { PALETTE } from '../../shared';
import { EVENT_ICON_CATALOG } from '../config/event.config';
import { EVENT_LEGEND_TOP_PX } from '../config/ui.config';
import { EVENT_KINDS_FILTERABLE, EVENT_KIND_LABELS, EventKind } from '../types/event.types';
import { OptionFragment } from '../types/option-fragment.types';
import { GRID_RIGHT_PX } from './grid.builder';

/**
 * Muted colour applied to a deselected chip's glyph and label, so a filtered-out
 * kind reads as off even when the text label is hidden on a narrow chart.
 */
const LEGEND_INACTIVE_COLOR = PALETTE.gray.color;

/** Rich-style token rendering a glyph in the muted, deselected colour. */
const INACTIVE_ICON_RICH_TOKEN = 'iconOff';

/** Stable component id of the event-type legend, distinguishing it from the lag legend. */
export const EVENT_LEGEND_ID = 'event-legend' as const;

/** Stable series-id prefix for the event-legend ghost series. */
const EVENT_LEGEND_SERIES_ID_PREFIX = 'event-legend-ghost' as const;

/**
 * Builds the stable ghost-series id for one event kind.
 *
 * @param kind - The event kind the ghost series represents.
 * @returns The series id.
 */
function eventLegendGhostSeriesId(kind: EventKind): string {
    return `${EVENT_LEGEND_SERIES_ID_PREFIX}-${kind}`;
}

/**
 * Presentation view-model for the event-type legend: the excluded-kind filter
 * driving chip selection.
 */
export interface EventLegendVm {
    readonly excludedKinds: ReadonlySet<EventKind>;
    readonly hideLabels: boolean;
}

/**
 * Stable non-positional options for the event-type legend. Mirrors the lag
 * legend's component base so the two stacked legends read as one control group.
 */
const EVENT_LEGEND_COMPONENT_BASE: Omit<Partial<LegendComponentOption>, 'left' | 'right' | 'top'> = {
    orient: 'horizontal',
    padding: [5, 10],
    itemGap: 20,
    itemWidth: 25,
    itemHeight: 14,
    textStyle: { fontSize: 12 },
    selectedMode: 'multiple',
    selector: false,
} as const;

/**
 * Builds the event-type legend fragment: one ghost `custom` series per
 * filterable event kind (data-less, anchoring each chip name) and the legend
 * component itself.
 *
 * The default swatch marker is hidden (`icon: 'none'`); each chip instead
 * renders its Material Icons glyph inline before the label via a per-kind rich
 * style, matching the roundels' icon and colour. The real event-icon series
 * stay nameless, so legend selection never hides them natively — roundel
 * visibility is driven instead by the excluded-kind filter applied in the
 * event-icons builder, keeping the event legend symmetric with the lag legend.
 * The `selected` map reflects that filter so the chip state survives the
 * full-replace rebuild ngx-echarts performs.
 *
 * @param legendVm - The excluded-kind filter.
 * @returns A partial option with the ghost `series` and the `legend` component.
 */
export function buildEventLegendFragment(legendVm: EventLegendVm): OptionFragment {
    return {
        series: buildEventGhostSeries(),
        legend: {
            ...EVENT_LEGEND_COMPONENT_BASE,
            right: GRID_RIGHT_PX,
            top: EVENT_LEGEND_TOP_PX,
            id: EVENT_LEGEND_ID,
            icon: 'none',
            itemWidth: 0,
            data: EVENT_KINDS_FILTERABLE.map((kind) => EVENT_KIND_LABELS[kind]),
            selected: buildSelectedMap(legendVm.excludedKinds),
            inactiveColor: LEGEND_INACTIVE_COLOR,
            formatter: buildIconLabelFormatter(legendVm.hideLabels, legendVm.excludedKinds),
            textStyle: { fontSize: 12, rich: buildIconRichStyles() } as LegendComponentOption['textStyle'],
        },
    };
}

/**
 * Builds the legend label formatter: renders each chip as its Material Icons
 * glyph followed by the kind label. A selected kind paints its glyph through
 * the per-kind rich token at the kind's colour; a deselected kind paints it
 * through the shared muted {@link INACTIVE_ICON_RICH_TOKEN}, so the glyph itself
 * signals the off state once the label text is hidden. Unknown names fall back
 * to their bare text. When `hideLabels` is set the label token is dropped,
 * leaving the glyph as the only chip content.
 *
 * @param hideLabels - When true the chip text is suppressed and only the icon
 *                     glyph is rendered.
 * @param excludedKinds - Kinds toggled off; their glyphs render in the muted
 *                        colour.
 * @returns A formatter mapping a chip label to its rich-text template.
 */
function buildIconLabelFormatter(
    hideLabels: boolean,
    excludedKinds: ReadonlySet<EventKind>,
): (name: string) => string {
    const kindByLabel = new Map<string, EventKind>(
        EVENT_KINDS_FILTERABLE.map((kind) => [EVENT_KIND_LABELS[kind], kind]),
    );
    return (name: string): string => {
        const kind = kindByLabel.get(name);
        if (kind === undefined) {
            return hideLabels ? '' : name;
        }
        const iconToken = excludedKinds.has(kind) ? INACTIVE_ICON_RICH_TOKEN : kind;
        const glyph = `{${iconToken}|${EVENT_ICON_CATALOG[kind].icon}}`;
        return hideLabels ? glyph : `${glyph} {label|${name}}`;
    };
}

/**
 * Builds the rich-style dictionary the legend formatter references: one Material
 * Icons style per filterable kind keyed by the kind, coloured to match its
 * roundel, a shared `label` style for the chip text, and a shared muted
 * {@link INACTIVE_ICON_RICH_TOKEN} style used for deselected kinds' glyphs.
 *
 * @returns A rich-style dictionary keyed by event kind, plus `label` and the
 *          muted-icon token.
 */
function buildIconRichStyles(): Record<string, unknown> {
    const styles: Record<string, unknown> = {
        label: { fontSize: 12, verticalAlign: 'middle' },
        [INACTIVE_ICON_RICH_TOKEN]: {
            fontFamily: 'Material Icons',
            fontSize: 16,
            color: LEGEND_INACTIVE_COLOR,
            verticalAlign: 'middle',
            padding: [0, 4, 0, 0],
        },
    };
    for (const kind of EVENT_KINDS_FILTERABLE) {
        styles[kind] = {
            fontFamily: 'Material Icons',
            fontSize: 16,
            color: EVENT_ICON_CATALOG[kind].color,
            verticalAlign: 'middle',
            padding: [0, 4, 0, 0],
        };
    }
    return styles;
}

/**
 * Builds one data-less ghost `custom` series per filterable event kind, each
 * named with its chip label so the legend has a stable series to anchor every
 * chip and its selection toggle. The empty `data` keeps `renderItem` from ever
 * running, and the chip glyph is drawn by the legend formatter rather than a
 * series swatch.
 *
 * @returns Ghost series in {@link EVENT_KINDS_FILTERABLE} order.
 */
function buildEventGhostSeries(): CustomSeriesOption[] {
    return EVENT_KINDS_FILTERABLE.map((kind) => ({
        id: eventLegendGhostSeriesId(kind),
        type: 'custom',
        name: EVENT_KIND_LABELS[kind],
        data: [],
        renderItem: () => null,
        silent: true,
        animation: false,
    }));
}

/**
 * Builds the legend `selected` map keyed by chip label: a kind is selected
 * unless it is in the excluded set. Covers the full filterable vocabulary so
 * every chip carries an explicit selection state on the full-replace path.
 *
 * @param excludedKinds - Event kinds the user has toggled off.
 * @returns Map from chip label to its selected flag.
 */
function buildSelectedMap(excludedKinds: ReadonlySet<EventKind>): Record<string, boolean> {
    return Object.fromEntries(
        EVENT_KINDS_FILTERABLE.map((kind) => [EVENT_KIND_LABELS[kind], !excludedKinds.has(kind)]),
    );
}
