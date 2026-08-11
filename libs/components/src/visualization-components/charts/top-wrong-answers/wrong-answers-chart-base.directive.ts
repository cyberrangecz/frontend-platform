import { computed, Directive, inject, input, InputSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { format } from 'date-fns';
import { ECElementEvent, ECharts, EChartsCoreOption } from 'echarts/core';
import { lastValueFrom } from 'rxjs';

import { EntityResolverService, EntityType } from '@crczp/event-query-engine';
import {
    PlatformEventType,
    AbstractLevelTypeEnum
} from '@crczp/training-model';

import {
    baseCategoryAxisDefaults,
    baseValueAxisDefaults,
    categoryTimeline,
    ChartPalette,
    ChartPanelInputs,
    ChartSourceStatus,
    CsvColumn,
    CsvExportable,
    EchartsChartBase,
    eventTypeColor,
    PALETTE,
    QuerySource,
    renderRichTooltipHtml,
    resolveInstanceLevels,
    richTooltipDefaults,
    RichTooltipRow,
    scrollableBarDataZoom,
} from '../shared';
import {
    aggregateTopWrongAnswers,
    TopWrongAnswersLevel,
    TopWrongAnswersVm,
    WrongAnswerRow,
} from './top-wrong-answers-source';
import { SegmentedToggleOption } from '../../../segmented-toggle/segmented-toggle.component';

/** Selectable visualisations of the wrong-answer data. */
type ChartView = 'pie' | 'bar';

/**
 * Level types on which a wrong answer can be submitted. Info and assessment levels
 * never carry wrong-answer submissions, so the level picker omits them.
 */
const WRONG_ANSWER_LEVEL_TYPES: readonly AbstractLevelTypeEnum[] = [
    AbstractLevelTypeEnum.Training,
    AbstractLevelTypeEnum.Access,
];

/** Minimal shape of the ECharts `timelinechanged` event payload. */
interface TimelineChangedEvent {
    readonly currentIndex: number;
}

/** Number of answer rows visible at once before the bar view scrolls. */
const VISIBLE_ROW_COUNT = 8;

/** Bar/slice color for wrong-answer submissions, from the shared semantic event palette. */
const WRONG_ANSWER_COLOR = eventTypeColor(PlatformEventType.WRONG_ANSWER_SUBMITTED);

/** Inner-ring (per-level share) color; gold, to contrast against the red answer slices. */
const LEVEL_SHARE_COLOR = '#d4af37';

/** Longest answer text shown in a tooltip before it is truncated; the full text is in the CSV. */
const TOOLTIP_ANSWER_MAX_CHARS = 256;

/** Minimal shape of the params an ECharts pie label formatter receives. */
interface PieLabelParams {
    readonly name?: string;
    readonly value?: number;
}

/** Precomputed stats attached to a wrong-answer data point, surfaced in its tooltip. */
interface AnswerTooltipData {
    readonly rank: number;
    readonly total: number;
    readonly ofLevel: number;
    readonly ofInstance: number;
}

/** Precomputed stats attached to a level data point, surfaced in its tooltip. */
interface LevelTooltipData {
    readonly distinct: number;
    readonly ofInstance: number;
}

/** Minimal shape of the params an ECharts pie tooltip formatter receives. */
interface PieTooltipParams {
    readonly seriesName?: string;
    readonly name?: string;
    readonly value?: number;
    readonly data?: unknown;
}

/** Minimal shape of the params an ECharts axis tooltip formatter receives for the bar view. */
interface BarTooltipParams {
    readonly name?: string;
    readonly value?: number;
    readonly data?: unknown;
}

/**
 * One row of the per-submission CSV export. Each individual wrong submission across
 * all levels contributes exactly one row.
 */
export interface TopWrongAnswersCsvRow {
    readonly level: string;
    readonly trainee: string;
    readonly answer: string;
    readonly attempt: number;
    readonly time: string;
}

/**
 * Index of the first level that has any wrong answers, used as the timeline's initial
 * selection so the chart opens on a populated level. Falls back to 0 when none do.
 *
 * @param levels Per-level ranked wrong answers, in definition order.
 * @returns      Zero-based index of the first non-empty level, or 0.
 */
function firstNonEmptyLevelIndex(levels: readonly TopWrongAnswersLevel[]): number {
    return Math.max(0, levels.findIndex((level) => level.answers.length > 0));
}

/**
 * Total wrong-answer submissions on a level, summed across its distinct answers.
 *
 * @param level The level whose submissions to total.
 * @returns     Sum of submission counts across the level's answers.
 */
function levelSubmissionTotal(level: TopWrongAnswersLevel): number {
    return level.answers.reduce((sum, entry) => sum + entry.submissions, 0);
}

/**
 * Builds a monochrome ramp of the wrong-answer color, darkest first, so adjacent pie
 * slices remain distinguishable while keeping the red "wrong answer" identity.
 *
 * @param count Number of distinct colors required; 0 yields an empty ramp.
 * @returns     `#RRGGBBAA` color strings, one per slice, fading by opacity.
 */
function wrongAnswerRamp(count: number): string[] {
    if (count <= 0) return [];
    if (count === 1) return [WRONG_ANSWER_COLOR];
    const minAlpha = 0.7;
    return Array.from({ length: count }, (_unused, index) => {
        const ratio = 1 - (index / (count - 1)) * (1 - minAlpha);
        const alpha = Math.round(ratio * 255);
        return `${WRONG_ANSWER_COLOR}${alpha.toString(16).padStart(2, '0')}`;
    });
}

/**
 * Truncates a long category label to keep pie labels legible, appending an ellipsis.
 *
 * @param value The full label text, possibly undefined.
 * @returns     The label trimmed to at most 14 characters.
 */
function truncateLabel(value: string | undefined): string {
    const text = value ?? '';
    return text.length > 14 ? `${text.slice(0, 13)}…` : text;
}

/**
 * Whole-number percentage of a part over a whole, guarding division by zero.
 *
 * @param part  The numerator.
 * @param whole The denominator.
 * @returns     `round(part / whole * 100)`, or 0 when whole is 0.
 */
function percentage(part: number, whole: number): number {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * Builds the tooltip HTML for a single wrong answer, titled by the answer text with
 * its submission count and ranking statistics beneath.
 *
 * @param title       The raw answer text shown as the tooltip title (escaped on render).
 * @param submissions How many times the answer was submitted.
 * @param data        Precomputed ranking stats, or undefined when unavailable.
 * @returns           Tooltip markup for the answer.
 */
function formatAnswerTooltip(title: string, submissions: number, data: AnswerTooltipData | undefined): string {
    const trimmedTitle =
        title.length > TOOLTIP_ANSWER_MAX_CHARS ? `${title.slice(0, TOOLTIP_ANSWER_MAX_CHARS)}…` : title;
    const rows: RichTooltipRow[] = [{ label: 'Times submitted', value: `${submissions}` }];
    if (data) {
        rows.push(
            { label: 'Rank on level', value: `#${data.rank} of ${data.total}` },
            { label: 'Share of level', value: `${data.ofLevel}%` },
            { label: 'Share of all wrong answers', value: `${data.ofInstance}%` },
        );
    }
    return renderRichTooltipHtml({ title: trimmedTitle, rows });
}

/**
 * Builds the tooltip HTML for a single level, titled by the level with its total wrong
 * submissions and breadth statistics beneath.
 *
 * @param title       The raw level title shown as the tooltip title (escaped on render).
 * @param submissions Total wrong submissions on the level.
 * @param data        Precomputed breadth stats, or undefined when unavailable.
 * @returns           Tooltip markup for the level.
 */
function formatLevelTooltip(title: string, submissions: number, data: LevelTooltipData | undefined): string {
    const rows: RichTooltipRow[] = [{ label: 'Wrong submissions', value: `${submissions}` }];
    if (data) {
        rows.push(
            { label: 'Distinct answers', value: `${data.distinct}` },
            { label: 'Share of all wrong answers', value: `${data.ofInstance}%` },
        );
    }
    return renderRichTooltipHtml({ title, rows });
}

/**
 * ECharts title configuration shown centered when a level has no wrong answers.
 *
 * @param palette Resolved theme palette supplying the text color.
 * @returns       A visible centered "no data" title configuration.
 */
function emptyLevelTitle(palette: ChartPalette): object {
    return {
        show: true,
        text: 'No wrong answers submitted on this level',
        left: 'center',
        top: 'middle',
        textStyle: { color: palette.mutedText, fontSize: 13, fontWeight: 'normal' },
    };
}

/**
 * Builds the horizontal-bar view: one ranked bar per wrong answer on the timeline's
 * selected level, with a fixed visible-row window and scroll for the rest.
 *
 * @param levels         Per-level ranked wrong answers, in definition order.
 * @param palette        Resolved theme palette.
 * @param currentIndex   Timeline checkpoint to select (the active level).
 * @param availableWidth Chart width in pixels, used to size level-picker labels.
 * @param scrollIndex    Zero-based index of the topmost visible answer row.
 * @returns              A timeline-driven ECharts option for the bar view.
 */
function buildBarOption(
    levels: readonly TopWrongAnswersLevel[],
    palette: ChartPalette,
    currentIndex: number,
    availableWidth: number,
    scrollIndex: number,
): EChartsCoreOption {
    const { mutedText } = palette;
    const instanceTotal = levels.reduce((sum, level) => sum + levelSubmissionTotal(level), 0);
    const perLevel = levels.map((level) => {
        const levelTotal = levelSubmissionTotal(level);
        return {
            title: level.answers.length === 0 ? emptyLevelTitle(palette) : { show: false },
            yAxis: { data: level.answers.map((entry) => entry.answer) },
            series: [
                {
                    data: level.answers.map((entry, index) => ({
                        value: entry.submissions,
                        rank: index + 1,
                        total: level.answers.length,
                        ofLevel: percentage(entry.submissions, levelTotal),
                        ofInstance: percentage(entry.submissions, instanceTotal),
                    })),
                },
            ],
        };
    });

    return {
        baseOption: {
            timeline: categoryTimeline(levels.map((level) => level.title), palette, currentIndex, availableWidth),
            title: { show: false },
            grid: { top: 16, right: 56, bottom: 104, left: 8, containLabel: true },
            dataZoom: scrollableBarDataZoom(palette, {
                totalRows: levels[currentIndex]?.answers.length ?? 0,
                visibleCount: VISIBLE_ROW_COUNT,
                startIndex: scrollIndex,
                top: 16,
                bottom: 104,
            }),
            tooltip: {
                ...richTooltipDefaults(palette),
                axisPointer: { type: 'shadow' },
                formatter: (params: BarTooltipParams | BarTooltipParams[]) => {
                    const items = Array.isArray(params) ? params : [params];
                    const [item] = items;
                    if (!item) return '';
                    return formatAnswerTooltip(
                        String(item.name ?? ''),
                        Number(item.value ?? 0),
                        item.data as AnswerTooltipData | undefined,
                    );
                },
            },
            xAxis: {
                ...baseValueAxisDefaults(palette),
                name: 'Times submitted',
                nameLocation: 'middle',
                nameGap: 24,
                nameTextStyle: { color: mutedText },
                minInterval: 1,
            },
            yAxis: {
                ...baseCategoryAxisDefaults(palette),
                boundaryGap: true,
                inverse: true,
                splitLine: { show: false },
                axisLabel: { color: mutedText, width: 150, overflow: 'truncate' },
            },
            series: [
                {
                    type: 'bar',
                    name: 'Submissions',
                    cursor: 'default',
                    barMaxWidth: 22,
                    itemStyle: { color: WRONG_ANSWER_COLOR, borderRadius: [0, 3, 3, 0] },
                },
            ],
        },
        options: perLevel,
    };
}

/**
 * Builds the double-ring pie view: an inner ring of each level's share of all wrong
 * answers (the timeline's selected level highlighted) and an outer ring breaking the
 * selected level down by distinct answer.
 *
 * @param levels         Per-level ranked wrong answers, in definition order.
 * @param palette        Resolved theme palette.
 * @param currentIndex   Timeline checkpoint to select (the active level).
 * @param availableWidth Chart width in pixels, used to size level-picker labels.
 * @returns              A timeline-driven ECharts option for the pie view.
 */
function buildPieOption(
    levels: readonly TopWrongAnswersLevel[],
    palette: ChartPalette,
    currentIndex: number,
    availableWidth: number,
): EChartsCoreOption {
    const instanceTotal = levels.reduce((sum, level) => sum + levelSubmissionTotal(level), 0);
    const perLevel = levels.map((level, selectedIndex) => {
        const outerColors = wrongAnswerRamp(level.answers.length);
        const levelTotal = levelSubmissionTotal(level);
        return {
            title: level.answers.length === 0 ? emptyLevelTitle(palette) : { show: false },
            series: [
                {
                    data: levels.map((entry, index) => {
                        const entryTotal = levelSubmissionTotal(entry);
                        return {
                            name: entry.title,
                            value: entryTotal,
                            distinct: entry.answers.length,
                            ofInstance: percentage(entryTotal, instanceTotal),
                            itemStyle: {
                                color: index === selectedIndex ? LEVEL_SHARE_COLOR : `${LEVEL_SHARE_COLOR}66`,
                            },
                        };
                    }),
                },
                {
                    data: level.answers.map((entry, index) => ({
                        name: entry.answer,
                        value: entry.submissions,
                        rank: index + 1,
                        total: level.answers.length,
                        ofLevel: percentage(entry.submissions, levelTotal),
                        ofInstance: percentage(entry.submissions, instanceTotal),
                        itemStyle: { color: outerColors[index] ?? WRONG_ANSWER_COLOR },
                    })),
                },
            ],
        };
    });

    return {
        baseOption: {
            timeline: categoryTimeline(levels.map((level) => level.title), palette, currentIndex, availableWidth),
            title: { show: false },
            tooltip: {
                ...richTooltipDefaults(palette),
                trigger: 'item',
                formatter: (params: PieTooltipParams) => {
                    const title = params.name ?? '';
                    const value = Number(params.value ?? 0);
                    return params.seriesName === 'Wrong answers'
                        ? formatAnswerTooltip(title, value, params.data as AnswerTooltipData | undefined)
                        : formatLevelTooltip(title, value, params.data as LevelTooltipData | undefined);
                },
            },
            series: [
                {
                    type: 'pie',
                    name: 'Level share',
                    cursor: 'pointer',
                    radius: ['0%', '42%'],
                    center: ['50%', '44%'],
                    label: {
                        show: true,
                        position: 'inside',
                        color: palette.mutedText,
                        fontSize: 12,
                        fontWeight: 'bold',
                        formatter: (params: PieLabelParams) => (params.value ? String(params.value) : ''),
                    },
                    labelLine: { show: false },
                    itemStyle: { borderColor: palette.surface, borderWidth: 1 },
                    emphasis: { scale: false },
                },
                {
                    type: 'pie',
                    name: 'Wrong answers',
                    cursor: 'default',
                    radius: ['48%', '68%'],
                    center: ['50%', '44%'],
                    label: {
                        show: true,
                        color: palette.mutedText,
                        fontSize: 12,
                        fontWeight: 'bold',
                        formatter: (params: PieLabelParams) =>
                            `${params.value ?? 0}× ${truncateLabel(params.name)}`,
                    },
                    labelLine: { length: 6, length2: 6 },
                    itemStyle: { borderColor: palette.surface, borderWidth: 1 },
                },
            ],
        },
        options: perLevel,
    };
}

/**
 * Shared logic for the wrong-answer analysis chart: per-level ranked incorrect answers
 * shown as a level-share pie or a ranked bar list, with an ECharts timeline level picker
 * and a per-submission CSV export. The level picker lists only the level types a wrong
 * answer can occur on ({@link WRONG_ANSWER_LEVEL_TYPES}).
 *
 * Concrete subclasses supply the data scope (instance-wide vs a single run) by providing
 * a {@link QuerySource}, plus the panel heading, info text, and CSV file name. Decorated
 * `@Directive()` so subclasses inherit the `instanceId` input and DI.
 */
@Directive()
export abstract class WrongAnswersChartBase
    extends EchartsChartBase
    implements ChartPanelInputs, CsvExportable<TopWrongAnswersCsvRow>
{
    /** Training instance whose wrong-answer submissions this chart visualises. */
    readonly instanceId: InputSignal<number> = input.required<number>();

    protected readonly entityResolver = inject(EntityResolverService);

    /** Raw wrong-answer rows; the scope (instance-wide vs single run) is set by the subclass. */
    protected abstract readonly source: QuerySource<readonly WrongAnswerRow[]>;

    /** Heading shown on the panel shell. */
    protected abstract readonly heading: string;

    /** Info text shown behind the panel shell's info button. */
    protected abstract readonly info: string;

    /** Selected visualisation, toggled by the segmented view control. */
    protected readonly view = signal<ChartView>('pie');

    /**
     * Timeline-selected level index, or null before the user picks one. Tracked in a
     * signal so live polling re-applies the user's chosen level instead of snapping
     * back to the first populated level on every refresh.
     */
    private readonly selectedLevelIndex = signal<number | null>(null);

    /**
     * Zero-based index of the topmost visible answer row in the bar view. Tracked in a
     * signal so the scroll position is fed back into every chart rebuild instead of
     * snapping to the top; reset to 0 when the level or view changes.
     */
    private readonly scrollStartIndex = signal<number>(0);

    /** Resolved instance and its ordered level list, used for the level picker axis. */
    private readonly resolved = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /**
     * Per-level ranked top wrong answers joined with the resolved level axis, scoped to
     * the level types a wrong answer can occur on (training and access).
     */
    protected readonly vm = computed<TopWrongAnswersVm | null>(() => {
        const resolved = this.resolved();
        if (resolved === null) return null;
        const rows = this.source.vm() ?? [];
        const byLevel = aggregateTopWrongAnswers(rows);
        const levels = resolved.levels
            .filter((level) => WRONG_ANSWER_LEVEL_TYPES.includes(level.type))
            .map((level): TopWrongAnswersLevel => ({
                order: level.order,
                title: level.title,
                answers: byLevel.get(level.order) ?? [],
            }));
        return { levels, totalSubmissions: rows.length };
    });

    /**
     * Reflects the worst-case status across the level resolution and the query source.
     * A selected scope with zero wrong answers is treated as `ready` so the clean-state
     * confirmation renders in place of the default empty placeholder.
     */
    protected readonly status = computed<ChartSourceStatus>(() => {
        if (this.source.status() === 'error') return 'error';
        if (this.resolved() === null) return 'loading';
        if (this.source.vm() === null) return 'loading';
        if ((this.vm()?.totalSubmissions ?? 0) === 0) return this.showCleanState() ? 'ready' : 'empty';
        return 'ready';
    });

    /** Color of the clean-state confirmation tick, from the shared semantic palette. */
    protected readonly cleanIconColor = PALETTE.green.color;

    /** Message shown when a selected scope has zero wrong answers; subclasses refine it. */
    protected readonly cleanMessage: string = 'No wrong answers';

    /**
     * Whether this chart is scoped to a specific selection (rather than the whole instance),
     * so that zero wrong answers reads as a clean result rather than absent data. The
     * instance-wide aggregated chart returns false; a run-scoped chart overrides it.
     *
     * @returns True when a concrete selection is in scope.
     */
    protected hasSelectedScope(): boolean {
        return false;
    }

    /**
     * Whether to show the clean-state confirmation: a selected scope, fully resolved, whose
     * data carries no wrong answers.
     */
    protected readonly showCleanState = computed<boolean>(() => {
        if (this.resolved() === null) return false;
        if (this.source.vm() === null) return false;
        return this.hasSelectedScope() && (this.vm()?.totalSubmissions ?? 0) === 0;
    });

    /**
     * Main-chart option for the active view. The level timeline (in each builder's base
     * option) switches levels internally; this recomputes only when the view, data, or
     * resolved palette changes.
     */
    protected readonly chartOptions = computed<EChartsCoreOption>(() => {
        const palette = this.palette();
        const availableWidth = this.chartWidth();
        const levels = this.vm()?.levels ?? [];
        const currentIndex = this.selectedLevelIndex() ?? firstNonEmptyLevelIndex(levels);
        return this.view() === 'bar'
            ? buildBarOption(levels, palette, currentIndex, availableWidth, this.scrollStartIndex())
            : buildPieOption(levels, palette, currentIndex, availableWidth);
    });

    /**
     * Registers wheel/slider row-scrolling: the bar view scrolls when its answer list
     * exceeds the visible window; the pie view has no scrollable list.
     */
    constructor() {
        super();
        this.configureRowScroll(this.scrollStartIndex, () => this.barRowCount(), VISIBLE_ROW_COUNT);
        this.configureTimelineScroll(
            () => this.selectedLevelIndex() ?? firstNonEmptyLevelIndex(this.vm()?.levels ?? []),
            () => this.vm()?.levels.length ?? 0,
            (index) => this.selectLevel(index),
        );
    }

    /**
     * Number of rows the bar view currently lists, used to bound wheel/slider scrolling.
     * Zero in the pie view, which has no scrollable list.
     *
     * @returns The selected level's answer count in the bar view, otherwise 0.
     */
    private barRowCount(): number {
        if (this.view() !== 'bar') return 0;
        const levels = this.vm()?.levels ?? [];
        const index = this.selectedLevelIndex() ?? firstNonEmptyLevelIndex(levels);
        return levels[index]?.answers.length ?? 0;
    }

    /**
     * Mirrors level selection into
     * `selectedLevelIndex`: from the timeline slider, and — in the pie view — from
     * clicking an inner-ring slice, which represents a single level.
     *
     * @param instance The ECharts instance being wired.
     */
    protected override wireChart(instance: ECharts): void {
        super.wireChart(instance);
        instance.on('timelinechanged', (event: TimelineChangedEvent) => this.selectLevel(event.currentIndex));
        instance.on('click', (event: ECElementEvent) => {
            if (event.seriesName !== 'Level share') return;
            this.selectLevel(event.dataIndex);
            instance.dispatchAction({ type: 'timelineChange', currentIndex: event.dataIndex });
        });
    }

    /**
     * Selects a level by its zero-based index, resetting the bar view's scroll window
     * to the top of the newly selected level.
     *
     * @param index Zero-based level index, aligned with the timeline checkpoints and
     *              the inner-ring slice order.
     */
    private selectLevel(index: number): void {
        this.selectedLevelIndex.set(index);
        this.scrollStartIndex.set(0);
    }

    /** Segments shown in the view toggle. */
    protected readonly viewOptions: readonly SegmentedToggleOption[] = [
        { value: 'pie', label: 'Pie', icon: 'donut_large' },
        { value: 'bar', label: 'Bar', icon: 'bar_chart' },
    ];

    /**
     * Switches the active view from the segmented toggle selection.
     *
     * @param value Selected view value; 'bar' shows the bar view, otherwise the pie view.
     */
    protected onViewSelected(value: string): void {
        this.view.set(value === 'bar' ? 'bar' : 'pie');
        this.scrollStartIndex.set(0);
    }

    /** @returns File name (without extension) for the downloaded CSV. */
    abstract csvFilename(): string;

    /**
     * @returns Column definitions for the CSV export, in output order. One row per
     *          individual wrong submission: the level it was made on, the trainee, the
     *          submitted answer, the attempt ordinal, and the submission time.
     */
    csvColumns(): ReadonlyArray<CsvColumn<TopWrongAnswersCsvRow>> {
        return [
            { header: 'Level', value: (row) => row.level },
            { header: 'Trainee', value: (row) => row.trainee },
            { header: 'Answer', value: (row) => row.answer },
            { header: 'Attempt', value: (row) => row.attempt },
            { header: 'Time', value: (row) => row.time },
        ];
    }

    /**
     * Resolves trainee display names on demand and returns one CSV row per individual
     * wrong submission, ordered chronologically. Resolution is deferred to export time
     * so no entity fetches run before download. Trainee name falls back from display
     * name to login to numeric id string; level falls back to its numeric order when
     * the title is unknown.
     *
     * @returns Promise resolving to one {@link TopWrongAnswersCsvRow} per submission.
     */
    async csvRows(): Promise<ReadonlyArray<TopWrongAnswersCsvRow>> {
        const rows = this.source.vm() ?? [];
        if (rows.length === 0) return [];
        const titleByOrder = new Map<number, string>(
            (this.resolved()?.levels ?? []).map((level) => [level.order, level.title] as const),
        );
        const ids = [...new Set(rows.map((row) => row.user_ref_id))];
        const nameById = await lastValueFrom(this.entityResolver.resolveMap(EntityType.User, ids));
        return [...rows]
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((row): TopWrongAnswersCsvRow => {
                const user = nameById.get(row.user_ref_id);
                const trainee = user?.name ?? user?.login ?? String(row.user_ref_id);
                return {
                    level: titleByOrder.get(row.level_order) ?? String(row.level_order),
                    trainee,
                    answer: row.answer_content,
                    attempt: row.count,
                    time: format(new Date(row.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                };
            });
    }
}
