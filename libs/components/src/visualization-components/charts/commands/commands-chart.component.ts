import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    InputSignal,
    signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { format } from 'date-fns';
import { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { lastValueFrom } from 'rxjs';

import { EntityResolverService, EntityType } from '@crczp/event-query-engine';
import { CategoricalColorPair, Utils } from '@crczp/utils';

import { SegmentedToggleComponent, SegmentedToggleOption } from '../../../segmented-toggle/segmented-toggle.component';

import {
    baseCategoryAxisDefaults,
    baseValueAxisDefaults,
    categoryTimeline,
    ChartPalette,
    ChartPanelInputs,
    ChartPanelShellComponent,
    commandColorPair,
    CsvColumn,
    CsvExportable,
    ECHARTS_CORE_PROVIDER,
    EchartsChartBase,
    renderRichTooltipHtml,
    resolveInstanceLevels,
    richTooltipDefaults,
    RichTooltipRow,
    scrollableBarDataZoom
} from '../shared';
import { CommandLevel, CommandsVm, createCommandsLiveSource } from './commands-source';

/** Per-level aggregated command view model consumed by the chart. */
type LevelViewModel = CommandLevel;

/** Level labels shown on the ECharts timeline slider when resolved titles are unavailable. */
const LEVEL_LABELS: readonly string[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

/** Number of bar rows visible at once before the chart scrolls. */
const VISIBLE_ROW_COUNT = 18;

/** Separator used in the encoded y-axis category value `"<index>|<label>"`. */
const CATEGORY_KEY_SEPARATOR = '|';

/** localStorage key under which the last-used fold/unfold default is persisted. */
const EXPANSION_DEFAULT_STORAGE_KEY = 'crczp.commands-chart.expansion-default';

/** Global fold/unfold mode governing whether tool variants are shown across all levels. */
type ExpansionMode = 'expanded' | 'collapsed';

/**
 * Reads the persisted fold/unfold mode from localStorage.
 *
 * @returns The stored mode, or 'collapsed' when absent or unrecognized.
 */
function readExpansionDefault(): ExpansionMode {
    return localStorage.getItem(EXPANSION_DEFAULT_STORAGE_KEY) === 'expanded' ? 'expanded' : 'collapsed';
}

/**
 * Persists the fold/unfold mode to localStorage so it carries across chart instances.
 *
 * @param value The mode to store.
 */
function writeExpansionDefault(value: ExpansionMode): void {
    localStorage.setItem(EXPANSION_DEFAULT_STORAGE_KEY, value);
}

/**
 * A single bar displayed in the chart. Either a tool-total header row or a
 * variant-detail row nested under a tool.
 */
interface DisplayRow {
    /** True for the tool-total aggregated bar; false for an argument-variant bar. */
    readonly isHeader: boolean;
    /** Tool name this row belongs to. */
    readonly tool: string;
    /**
     * Label shown on the y-axis.
     * Header rows: the tool name.
     * Variant rows: the full canon string (`tool opt`).
     */
    readonly canon: string;
    /** Total invocations displayed as the bar value. */
    readonly uses: number;
    /** Distinct trainees shown in the tooltip. */
    readonly trainees: number;
    /** Number of argument variants under this tool (header rows only; 0 for variants). */
    readonly variantCount: number;
}

/** One row in the commands CSV export. */
export interface CommandsCsvRow {
    /** Formatted timestamp string of the command event. */
    readonly time: string;
    /** Resolved trainee display name, login, or numeric ID string. */
    readonly trainee: string;
    /** Base tool name of the command. */
    readonly tool: string;
    /** Raw argument string, or empty string when invoked without arguments. */
    readonly arguments: string;
    /** Title of the level on which the command was issued. */
    readonly level: string;
}

/**
 * Escapes HTML metacharacters so that argument strings containing angle-bracket
 * placeholders or ampersands are rendered as plain text inside ECharts tooltips.
 *
 * @param value Raw text that may contain HTML metacharacters.
 * @returns     The text with `&`, `<`, `>`, and `"` replaced by HTML entities.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Builds the ECharts title configuration shown centered when a level has no
 * recorded command data, matching the empty-level presentation used by other
 * dashboard charts.
 *
 * @param palette Resolved theme palette supplying the muted text color.
 * @returns       An ECharts title option fragment that centers a no-data message.
 */
function buildEmptyLevelTitle(palette: ChartPalette): object {
    return {
        show: true,
        text: 'No commands recorded on this level',
        left: 'center',
        top: 'middle',
        textStyle: { color: palette.mutedText, fontSize: 13, fontWeight: 'normal' },
    };
}

/**
 * Encodes a y-axis category value as `"<index>|<label>"` so that each
 * category key is unique even when two tools share a name, and the click
 * handler can recover the original data index from an axis-label event.
 *
 * @param index Zero-based position of the display row.
 * @param label Display text of the row.
 * @returns     Encoded category key.
 */
function encodeCategory(index: number, label: string): string {
    return `${index}${CATEGORY_KEY_SEPARATOR}${label}`;
}

/**
 * Recovers the numeric data index from an encoded category value produced by
 * {@link encodeCategory}. Returns -1 when the value does not contain the
 * separator.
 *
 * @param encodedValue Encoded category value from a y-axis click event.
 * @returns            Zero-based data index, or -1 on parse failure.
 */
function decodeCategoryIndex(encodedValue: string): number {
    const separatorPosition = encodedValue.indexOf(CATEGORY_KEY_SEPARATOR);
    if (separatorPosition < 0) return -1;
    return parseInt(encodedValue.slice(0, separatorPosition), 10);
}

/**
 * Dashboard panel visualising which shell commands trainees used on each level.
 * Presents an ECharts horizontal grouped-bar chart: one bar per tool (total uses)
 * followed by lighter bars for each argument variant. The level timeline slider
 * switches levels; clicking a tool bar or its label collapses or expands the
 * variants beneath it. A fuzzy filter input narrows visible tools and variants.
 *
 * Data is sourced live from the local event cache via {@link createCommandsLiveSource},
 * correlating command events with level-started events to attribute each command to
 * a level and trainee. Supports CSV export of the currently filtered level's events.
 */
@Component({
    selector: 'crczp-commands-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent, FormsModule, MatFormFieldModule, MatIconModule, MatInputModule, SegmentedToggleComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './commands-chart.component.html',
    styleUrl: './commands-chart.component.scss',
})
export class CommandsChartComponent extends EchartsChartBase implements ChartPanelInputs, CsvExportable<CommandsCsvRow> {
    /**
     * Training instance identifier used to scope the live command and
     * level-started event queries.
     */
    readonly instanceId: InputSignal<number> = input.required<number>();

    /** Zero-based index of the currently selected timeline level. */
    protected readonly selectedLevelIndex = signal<number>(0);

    /**
     * Zero-based index of the topmost visible bar row. Tracked in a signal so the scroll
     * position is fed back into every chart rebuild instead of snapping to the top; reset
     * to 0 when the level, filter, or tool-expansion changes the row list.
     */
    protected readonly scrollStartIndex = signal<number>(0);

    /**
     * Global fold/unfold mode applied to every level. Seeded from the persisted default
     * and updated by the expansion toggle; it governs each level the user navigates to,
     * so a single expand/collapse choice carries across the whole timeline.
     */
    protected readonly expansionMode = signal<ExpansionMode>(readExpansionDefault());

    /**
     * Tool names whose expansion is flipped relative to {@link expansionMode} for the
     * level currently in view. Holds individual fold/unfold clicks and is cleared on level
     * selection so the global mode governs each newly viewed level. While a filter query is
     * active, overrides are suspended and all matching variants are always shown.
     */
    protected readonly toolOverrides = signal<ReadonlySet<string>>(new Set<string>());

    /** Current text entered in the fuzzy filter input; empty string means no filter. */
    protected readonly filterQuery = signal<string>('');

    /** Segments shown in the fold/unfold mode toggle, in display order. */
    protected readonly expansionOptions: readonly SegmentedToggleOption[] = [
        { value: 'collapsed', label: 'Initially collapsed', icon: 'unfold_less' },
        { value: 'expanded', label: 'Initially expanded', icon: 'unfold_more' },
    ];

    private readonly entityResolver = inject(EntityResolverService);

    /** Live source pulling correlated command data from the local event cache. */
    protected readonly commandsSource = createCommandsLiveSource(this.instanceId);

    /**
     * Resolved instance levels supplying the timeline picker labels; null while loading.
     * Resolved through entity resolution, mirroring the top-wrong-answers level axis.
     */
    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /**
     * Timeline labels for the level picker: resolved level titles when available,
     * falling back to placeholder labels while resolution is pending.
     */
    private readonly levelLabels = computed<readonly string[]>(() => {
        const levels = this.resolvedLevels()?.levels;
        return levels && levels.length > 0 ? levels.map((level) => level.title) : LEVEL_LABELS;
    });

    /**
     * Per-timeline-index view models derived from the live source, keyed by zero-based
     * timeline index. Each index maps to its resolved level order, then looks up the
     * aggregated {@link CommandLevel} from the live source. Falls back to an empty level
     * when no commands have been received for that level yet.
     */
    private readonly levelViewModels = computed<ReadonlyMap<number, LevelViewModel>>(() => {
        const levels = this.resolvedLevels()?.levels ?? [];
        const byLevel = this.commandsSource.vm()?.byLevel ?? new Map<number, CommandLevel>();
        const result = new Map<number, LevelViewModel>();
        levels.forEach((level, index) => {
            result.set(index, byLevel.get(level.order) ?? { levelTrainees: 0, sortedTools: [] });
        });
        return result;
    });

    /**
     * Whether the user has explicitly picked a level via the timeline slider.
     * Guards the auto-select effect so it does not override a user's choice.
     */
    private userPickedLevel = false;

    /** Registers wheel/slider row-scrolling bounded by the current display-row count. */
    constructor() {
        super();
        this.configureRowScroll(this.scrollStartIndex, () => this.displayRows().length, VISIBLE_ROW_COUNT);
        this.configureTimelineScroll(
            () => this.selectedLevelIndex(),
            () => this.levelLabels().length,
            (index) => this.onTimelineChanged({ currentIndex: index }),
        );

        effect(() => {
            if (this.userPickedLevel) return;
            const vm = this.commandsSource.vm();
            if (vm === null) return;
            const levels = this.resolvedLevels()?.levels ?? [];
            const byLevel = vm.byLevel;
            for (let index = 0; index < levels.length; index++) {
                const levelEntry = levels[index];
                if (levelEntry === undefined) continue;
                const levelData = byLevel.get(levelEntry.order);
                if (levelData !== undefined && levelData.sortedTools.length > 0) {
                    this.selectedLevelIndex.set(index);
                    this.userPickedLevel = true;
                    return;
                }
            }
        });
    }

    /**
     * Resolves whether a tool's variant rows are shown, combining the global
     * {@link expansionMode} with any per-tool override flip recorded for the viewed level.
     *
     * @param tool Tool name to test.
     * @returns    True when the tool's variant rows should be displayed.
     */
    private isToolExpanded(tool: string): boolean {
        const expandedByMode = this.expansionMode() === 'expanded';
        return this.toolOverrides().has(tool) ? !expandedByMode : expandedByMode;
    }

    /**
     * View model for the currently selected level, re-resolved reactively when
     * `selectedLevelIndex` changes.
     */
    private readonly currentLevelViewModel = computed<LevelViewModel>(() => {
        const levelIndex = this.selectedLevelIndex();
        return this.levelViewModels().get(levelIndex) ?? { levelTrainees: 0, sortedTools: [] };
    });

    /**
     * Flat ordered display rows for the current level, filtered and collapsed.
     * Tool header rows are always included if they match the filter; their variant
     * rows follow immediately and are shown when the tool is not collapsed (or when
     * a filter is active, which suspends collapse). Rows are the single source of
     * truth for bar values, y-labels, tooltip, and click routing.
     */
    protected readonly displayRows = computed<readonly DisplayRow[]>(() => {
        const { sortedTools } = this.currentLevelViewModel();
        const query = this.filterQuery().trim();
        const isFiltering = query.length > 0;
        const rows: DisplayRow[] = [];

        for (const toolEntry of sortedTools) {
            const toolMatches = Utils.String.searchFuzzy(toolEntry.tool, query);

            const matchingVariants = isFiltering
                ? toolEntry.variants.filter(
                    (variant) =>
                        toolMatches || Utils.String.searchFuzzy(`${toolEntry.tool} ${variant.opt}`, query),
                )
                : toolEntry.variants;

            if (isFiltering && !toolMatches && matchingVariants.length === 0) continue;

            const isExpanded = isFiltering || this.isToolExpanded(toolEntry.tool);

            rows.push({
                isHeader: true,
                tool: toolEntry.tool,
                canon: toolEntry.tool,
                uses: toolEntry.uses,
                trainees: toolEntry.trainees,
                variantCount: toolEntry.variants.length,
            });

            if (isExpanded) {
                for (const variant of matchingVariants) {
                    rows.push({
                        isHeader: false,
                        tool: toolEntry.tool,
                        canon: `${toolEntry.tool} ${variant.opt}`,
                        uses: variant.uses,
                        trainees: variant.trainees,
                        variantCount: 0,
                    });
                }
            }
        }

        return rows;
    });

    /**
     * Statistics line shown in the panel header chrome for the current level.
     * While filtering, it reports how many forms match the query; when idle, it
     * reports the full counts plus the average uses per trainee.
     */
    protected readonly statsLine = computed<string>(() => {
        const query = this.filterQuery().trim();
        const { sortedTools, levelTrainees } = this.currentLevelViewModel();
        const totalUses = sortedTools.reduce((sum, tool) => sum + tool.uses, 0);
        const totalForms = sortedTools.reduce((sum, tool) => sum + tool.variants.length, 0);
        const toolCount = sortedTools.length;

        if (query.length > 0) {
            const rows = this.displayRows();
            const matchingForms = rows.filter((row) => !row.isHeader).length;
            const matchingTools = new Set(rows.filter((row) => row.isHeader).map((row) => row.tool)).size;
            return `${matchingForms} of ${totalForms} forms match · ${matchingTools} tools`;
        }

        const perTrainee = levelTrainees > 0 ? (totalUses / levelTrainees).toFixed(1) : '—';
        return `${totalUses} commands · ${totalForms} forms · ${toolCount} tools · ${perTrainee} per trainee`;
    });

    /**
     * Complete ECharts option object for the commands bar chart, rebuilt reactively
     * whenever the selected level, collapsed set, filter query, or resolved palette
     * changes. Built in the `{baseOption, options}` timeline form so ECharts manages
     * level switching internally.
     */
    protected readonly chartOptions = computed<EChartsCoreOption>(() => {
        const palette = this.palette();
        const currentIndex = this.selectedLevelIndex();
        return this.buildChartOption(palette, currentIndex, this.levelLabels(), this.chartWidth(), this.scrollStartIndex());
    });

    /**
     * Constructs the full ECharts option in `{baseOption, options}` form.
     * One entry in `options` per level holds that level's y-axis categories, series
     * data, and empty-level title. The base option carries the shared axis/zoom/tooltip
     * config and the timeline with `currentIndex` set so rebuilds re-pin the selection.
     *
     * @param palette        Resolved theme palette.
     * @param currentIndex   Zero-based timeline index to pre-select.
     * @param labels         Level titles for the timeline picker, in definition order.
     * @param availableWidth Chart width in pixels, used to size level-picker labels.
     * @param scrollIndex    Zero-based index of the topmost visible bar row.
     * @returns              Timeline-driven ECharts option for the bar chart.
     */
    private buildChartOption(
        palette: ChartPalette,
        currentIndex: number,
        labels: readonly string[],
        availableWidth: number,
        scrollIndex: number,
    ): EChartsCoreOption {
        const query = this.filterQuery().trim();
        const isFiltering = query.length > 0;

        const perLevel = labels.map((_, levelIndex) => {
            const viewModel = this.levelViewModels().get(levelIndex) ?? { levelTrainees: 0, sortedTools: [] };

            const rows: DisplayRow[] = [];

            for (const toolEntry of viewModel.sortedTools) {
                const toolMatches = Utils.String.searchFuzzy(toolEntry.tool, query);
                const matchingVariants = isFiltering
                    ? toolEntry.variants.filter(
                        (variant) =>
                            toolMatches || Utils.String.searchFuzzy(`${toolEntry.tool} ${variant.opt}`, query),
                    )
                    : toolEntry.variants;

                if (isFiltering && !toolMatches && matchingVariants.length === 0) continue;

                const isExpanded = isFiltering || this.isToolExpanded(toolEntry.tool);

                rows.push({
                    isHeader: true,
                    tool: toolEntry.tool,
                    canon: toolEntry.tool,
                    uses: toolEntry.uses,
                    trainees: toolEntry.trainees,
                    variantCount: toolEntry.variants.length,
                });

                if (isExpanded) {
                    for (const variant of matchingVariants) {
                        rows.push({
                            isHeader: false,
                            tool: toolEntry.tool,
                            canon: `${toolEntry.tool} ${variant.opt}`,
                            uses: variant.uses,
                            trainees: variant.trainees,
                            variantCount: 0,
                        });
                    }
                }
            }

            const isEmpty = viewModel.sortedTools.length === 0;
            const slotCount = Math.max(rows.length, VISIBLE_ROW_COUNT);

            return {
                title: isEmpty ? buildEmptyLevelTitle(palette) : { show: false },
                yAxis: {
                    data: Array.from({ length: slotCount }, (_, index) =>
                        encodeCategory(index, rows[index]?.canon ?? ''),
                    ),
                },
                series: [
                    {
                        data: Array.from({ length: slotCount }, (_, index) => {
                            const row = rows[index];
                            if (row === undefined) {
                                return { value: null };
                            }
                            const colors = commandColorPair(row.tool);
                            return {
                                value: row.uses,
                                cursor: row.isHeader ? 'pointer' : 'default',
                                itemStyle: {
                                    color: row.isHeader ? colors.dark : `${colors.light}9e`,
                                    borderRadius: [0, 3, 3, 0] as [number, number, number, number],
                                },
                                emphasis: {
                                    itemStyle: {
                                        color: row.isHeader ? colors.dark : colors.light,
                                    },
                                },
                            };
                        }),
                    },
                ],
            };
        });

        return {
            baseOption: {
                animation: false,
                timeline: categoryTimeline(labels, palette, currentIndex, availableWidth),
                title: { show: false },
                graphic: {
                    elements: [
                        {
                            type: 'text',
                            left: 6,
                            top: 11,
                            cursor: 'default',
                            style: {
                                text: this.statsLine(),
                                fill: palette.mutedText,
                                fontSize: 12,
                            },
                        },
                        {
                            type: 'text',
                            left: 'center',
                            top: 10,
                            cursor: 'default',
                            style: {
                                fill: palette.mutedText,
                                fontSize: 11,
                                text: '{dark|}  {label|Command total}     {light|}  {label|Option variant}     {hint|Click a bar to fold / unfold}',
                                rich: {
                                    dark: { backgroundColor: this.legendDarkColor, width: 10, height: 10, borderRadius: 2 },
                                    light: { backgroundColor: `${this.legendLightColor}9e`, width: 10, height: 10, borderRadius: 2 },
                                    label: { fill: palette.mutedText, fontSize: 11 },
                                    hint: { fill: palette.mutedText, fontSize: 11, fontStyle: 'italic', opacity: 0.75 },
                                },
                            },
                        },
                    ],
                },
                grid: { top: 60, right: 56, bottom: 104, left: 8, containLabel: true },
                dataZoom: scrollableBarDataZoom(palette, {
                    totalRows: this.displayRows().length,
                    visibleCount: VISIBLE_ROW_COUNT,
                    startIndex: scrollIndex,
                    top: 60,
                    bottom: 104,
                }),
                tooltip: {
                    ...richTooltipDefaults(palette),
                    trigger: 'item',
                    axisPointer: { type: 'shadow' },
                    formatter: (params: unknown) => {
                        const item = params as { dataIndex?: number; value?: number };
                        const dataIndex = item.dataIndex ?? -1;
                        const rows = this.displayRows();
                        const row = rows[dataIndex];
                        if (row === undefined) return '';
                        const detail: RichTooltipRow[] = row.isHeader
                            ? [
                                  { label: 'Forms', value: `${row.variantCount}` },
                                  { label: 'Uses', value: `${row.uses}` },
                                  { label: 'Trainees', value: `${row.trainees}` },
                              ]
                            : [
                                  { label: 'Uses', value: `${row.uses}` },
                                  { label: 'Trainees', value: `${row.trainees}` },
                              ];
                        return renderRichTooltipHtml({ title: row.canon, rows: detail });
                    },
                },
                xAxis: {
                    ...baseValueAxisDefaults(palette),
                    name: 'uses',
                    nameLocation: 'middle',
                    nameGap: 24,
                    nameTextStyle: { color: palette.mutedText },
                    minInterval: 1,
                },
                yAxis: {
                    ...baseCategoryAxisDefaults(palette),
                    type: 'category',
                    boundaryGap: true,
                    inverse: true,
                    triggerEvent: true,
                    splitLine: { show: false },
                    axisLabel: {
                        color: palette.mutedText,
                        width: 340,
                        overflow: 'truncate',
                        rich: {
                            tool: {
                                fontWeight: 'bold',
                                color: palette.mutedText,
                                fontSize: 12,
                            },
                            muted: {
                                fontSize: 11,
                                color: palette.mutedText,
                                opacity: 0.7,
                            },
                            mono: {
                                fontFamily: 'monospace',
                                fontSize: 11,
                                color: palette.mutedText,
                                opacity: 0.85,
                            },
                        },
                        formatter: (encodedValue: string): string => {
                            const dataIndex = decodeCategoryIndex(encodedValue);
                            const rows = this.displayRows();
                            const row = rows[dataIndex];
                            if (row === undefined) return '';
                            if (row.isHeader) {
                                const glyph = this.isToolExpanded(row.tool) ? '▾' : '▸';
                                const countLabel = `${row.variantCount} \xb7 ${row.uses}`;
                                return `{tool|${glyph} ${escapeHtml(row.tool)}} {muted|${countLabel}}`;
                            }
                            return `{mono|${escapeHtml(row.canon)}}`;
                        },
                    },
                },
                series: [
                    {
                        type: 'bar',
                        name: 'Commands',
                        cursor: 'default',
                        barMaxWidth: 24,
                    },
                ],
            },
            options: perLevel,
        };
    }

    /**
     * Handles the ECharts `chartclick` output. Routes series bar clicks via
     * `dataIndex` and y-axis label clicks via the encoded category value to the
     * same toggle logic — if the resolved row is a header, the tool's collapsed
     * state is toggled.
     *
     * @param event ECharts click event carrying `componentType` and either
     *              `dataIndex` (series) or `value` (yAxis label).
     */
    protected onChartClick(event: ECElementEvent): void {
        let resolvedRow: DisplayRow | undefined;

        if (event.componentType === 'series') {
            resolvedRow = this.displayRows()[event.dataIndex];
        } else if (event.componentType === 'yAxis') {
            const encodedValue = String(event.value ?? '');
            const dataIndex = decodeCategoryIndex(encodedValue);
            resolvedRow = dataIndex >= 0 ? this.displayRows()[dataIndex] : undefined;
        }

        if (!resolvedRow?.isHeader) return;
        this.toggleToolExpansion(resolvedRow.tool);
    }

    /**
     * Handles a timeline selection change emitted by ngx-echarts and updates the
     * selected level signal so the chart rebuilds for the new level.
     *
     * @param event ECharts `timelinechanged` event payload carrying `currentIndex`.
     */
    protected onTimelineChanged(event: { currentIndex: number }): void {
        this.userPickedLevel = true;
        this.selectedLevelIndex.set(event.currentIndex);
        this.toolOverrides.set(new Set<string>());
        this.scrollStartIndex.set(0);
    }

    /**
     * Flips a single tool's expansion relative to the global mode for the viewed level
     * by toggling its membership in {@link toolOverrides}.
     *
     * @param toolName The tool name to toggle.
     */
    private toggleToolExpansion(toolName: string): void {
        const next = new Set(this.toolOverrides());
        if (next.has(toolName)) {
            next.delete(toolName);
        } else {
            next.add(toolName);
        }
        this.toolOverrides.set(next);
        this.scrollStartIndex.set(0);
    }

    /**
     * Applies a new global fold/unfold mode selected from the expansion toggle. Discards
     * per-tool overrides so the chosen mode governs every level, and persists the choice.
     *
     * @param value The selected mode value from the segmented toggle.
     */
    protected onExpansionModeChanged(value: string): void {
        const mode = value as ExpansionMode;
        this.expansionMode.set(mode);
        this.toolOverrides.set(new Set<string>());
        this.scrollStartIndex.set(0);
        writeExpansionDefault(mode);
    }

    /**
     * Handles changes to the filter query input, updating the reactive signal
     * so the chart options and stats line recompute automatically.
     *
     * @param query The current filter text from the input element.
     */
    protected onFilterChange(query: string): void {
        this.filterQuery.set(query);
        this.scrollStartIndex.set(0);
    }

    /** Colour pair of the first tool group, mirrored by the legend key swatches. */
    private readonly legendColorPair: CategoricalColorPair = Utils.Color.categoricalPair(0);

    /** Representative dark color for the legend key's "command total" swatch. */
    protected readonly legendDarkColor: string = this.legendColorPair.dark;

    /** Representative light color for the legend key's "option variant" swatch. */
    protected readonly legendLightColor: string = this.legendColorPair.light;

    /** @returns File name (without extension) for the downloaded CSV. */
    csvFilename(): string {
        return 'commands';
    }

    /**
     * @returns Column definitions for the CSV export, in output order. One row per
     *          correlated command event on the selected level, filtered by the active
     *          fuzzy query.
     */
    csvColumns(): ReadonlyArray<CsvColumn<CommandsCsvRow>> {
        return [
            { header: 'Time', value: (row) => row.time },
            { header: 'Trainee', value: (row) => row.trainee },
            { header: 'Tool', value: (row) => row.tool },
            { header: 'Arguments', value: (row) => row.arguments },
            { header: 'Level', value: (row) => row.level },
        ];
    }

    /**
     * Resolves trainee display names on demand and returns one CSV row per correlated
     * command event on the currently selected level that matches the active fuzzy filter.
     * Resolution is deferred to export time. Trainee name falls back from display name
     * to login to numeric ID string. Rows are sorted chronologically by timestamp.
     *
     * @returns Promise resolving to one {@link CommandsCsvRow} per matching command event.
     */
    async csvRows(): Promise<ReadonlyArray<CommandsCsvRow>> {
        const vm: CommandsVm | null = this.commandsSource.vm();
        if (vm === null) return [];

        const levels = this.resolvedLevels()?.levels ?? [];
        const levelIndex = this.selectedLevelIndex();
        const selectedLevel = levels[levelIndex];
        if (selectedLevel === undefined) return [];

        const selectedOrder = selectedLevel.order;
        const selectedTitle = selectedLevel.title;

        const query = this.filterQuery().trim();
        const events = vm.events.filter((commandEvent) => {
            if (commandEvent.levelOrder !== selectedOrder) return false;
            if (query.length === 0) return true;
            const searchTarget = commandEvent.opt.length > 0
                ? `${commandEvent.tool} ${commandEvent.opt}`
                : commandEvent.tool;
            return Utils.String.searchFuzzy(commandEvent.tool, query) || Utils.String.searchFuzzy(searchTarget, query);
        });

        if (events.length === 0) return [];

        const distinctUserRefIds = [...new Set(events.map((commandEvent) => commandEvent.userRefId))];
        const nameById = await lastValueFrom(
            this.entityResolver.resolveMap(EntityType.User, distinctUserRefIds),
        );

        return [...events]
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((commandEvent): CommandsCsvRow => {
                const user = nameById.get(commandEvent.userRefId);
                const trainee = user?.name ?? user?.login ?? String(commandEvent.userRefId);
                return {
                    time: format(new Date(commandEvent.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                    trainee,
                    tool: commandEvent.tool,
                    arguments: commandEvent.opt,
                    level: selectedTitle,
                };
            });
    }
}
