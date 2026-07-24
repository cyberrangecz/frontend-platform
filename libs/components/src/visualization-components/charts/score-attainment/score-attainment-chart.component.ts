import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    InputSignal,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { TimelineComponentOption } from 'echarts';
import { ECharts, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { lastValueFrom } from 'rxjs';

import { EntityResolverService, EntityType } from '@crczp/event-query-engine';

import {
    ChartPalette,
    ChartPanelInputs,
    ChartPanelShellComponent,
    ChartSourceStatus,
    CsvColumn,
    CsvExportable,
    ECHARTS_CORE_PROVIDER,
    EchartsChartBase,
    mergeSourceStatuses,
    PALETTE,
    QuerySource,
    renderRichTooltipHtml,
    resolveInstanceLevels,
    richTooltipDefaults,
    RichTooltipRow,
} from '../shared';
import { createScoreAttainmentSource, RunScore, RunState } from './score-attainment-source';

const INTERVALS: readonly number[] = [1, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20];
/** Bin width selected on first render, in percentage points. */
const DEFAULT_INTERVAL = 10;
const DEFAULT_INTERVAL_INDEX = Math.max(0, INTERVALS.indexOf(DEFAULT_INTERVAL));

const ALL_SERIES_NAME = 'All';
const FINISHED_SERIES_NAME = 'Finished';

/** Bar colour of the finished-runs distribution (PALETTE green). */
const FINISHED_COLOR = PALETTE.green.color;

/** Which population's score distribution the legend toggle currently shows. */
type DistributionSeries = 'all' | 'finished';

/** The two same-axis score distributions the histogram bins, plus run count. */
interface ScoreAttainmentVm {
    /** Every run's total score as a percentage of the instance max. */
    readonly allPercents: readonly number[];
    /** Finished runs' total score as a percentage of the instance max. */
    readonly finishedPercents: readonly number[];
    /** Instance max score, surfaced for the tooltip's points-equivalent. */
    readonly totalMax: number;
    /** Number of runs on the instance. */
    readonly runCount: number;
}

/** One row of the per-run CSV export. */
interface ScoreAttainmentCsvRow {
    readonly trainee: string;
    readonly login: string;
    readonly email: string;
    readonly totalScore: number;
    readonly maxScore: number;
    readonly scorePercent: number;
    readonly completedLevels: number;
    readonly state: RunState;
}

interface AxisTooltipParam {
    readonly name: string;
    readonly value: number;
}

interface TimelineChangedEvent {
    readonly currentIndex: number;
}

interface LegendSelectChangedEvent {
    readonly name: string;
}

/**
 * Clamps a percentage to the inclusive 0–100 range.
 *
 * @param value Raw percentage that may fall outside 0–100.
 * @returns The value constrained to 0–100.
 */
function clampPercent(value: number): number {
    return Math.min(100, Math.max(0, value));
}

/**
 * Expresses a run's total score as a percentage of the instance max.
 *
 * @param run       The run whose score to express as a percentage.
 * @param totalMax  Instance max score; values at or below zero yield 0.
 * @returns The score percentage, clamped to 0–100.
 */
function scorePercentOf(run: RunScore, totalMax: number): number {
    if (totalMax <= 0) return 0;
    return clampPercent(Math.round((run.totalScore / totalMax) * 100));
}

/**
 * Number of equal-width bands spanning the 0–100 range for a given band width.
 *
 * @param intervalWidth Width of each band in percentage points; at least 1.
 * @returns Count of bands needed to cover 0–100, rounding the final partial band up.
 */
function bandCountFor(intervalWidth: number): number {
    return Math.ceil(100 / intervalWidth);
}

/**
 * Buckets percentage values (0–100) into equal-width bands.
 *
 * @param values Percentage values to bin, each expected in the range 0–100.
 * @param intervalWidth Width of each band in percentage points; at least 1.
 * @returns Per-band counts, length equal to the band count, ordered low band to high band.
 */
function binCounts(values: readonly number[], intervalWidth: number): number[] {
    const bandCount = bandCountFor(intervalWidth);
    const counts = new Array<number>(bandCount).fill(0);
    for (const value of values) {
        const index = Math.min(Math.floor(value / intervalWidth), bandCount - 1);
        counts[index] = (counts[index] ?? 0) + 1;
    }
    return counts;
}

/**
 * Builds the band edge labels for a given band width.
 *
 * @param intervalWidth Width of each band in percentage points; at least 1.
 * @returns Band labels such as `40–60%`, ordered low band to high band, last band clamped to 100.
 */
function bandLabels(intervalWidth: number): string[] {
    const bandCount = bandCountFor(intervalWidth);
    return Array.from({ length: bandCount }, (_unused, index) => {
        const low = index * intervalWidth;
        const high = Math.min((index + 1) * intervalWidth, 100);
        return `${low}–${high}%`;
    });
}

/**
 * Formats the shared axis-pointer tooltip for a hovered percentage band, listing the
 * trainee count of each visible distribution and the band's points-equivalent.
 *
 * @param params   Axis-trigger tooltip entries, one per visible series at the hovered band.
 * @param totalMax Instance max score, used to express the band as a points range.
 * @returns HTML tooltip markup, or an empty string when no entry is present.
 */
function formatBandTooltip(params: AxisTooltipParam | AxisTooltipParam[], totalMax: number): string {
    const entries = Array.isArray(params) ? params : [params];
    const first = entries[0];
    if (first === undefined) return '';
    const [lowText, highText] = first.name.replace('%', '').split('–');
    const pointsLow = Math.round((Number(lowText) / 100) * totalMax);
    const pointsHigh = Math.round((Number(highText) / 100) * totalMax);
    const rows: RichTooltipRow[] = entries.map((entry) => ({
        label: 'Trainees',
        value: `${entry.value}`,
    }));
    rows.push({ label: 'Points', value: `${pointsLow}–${pointsHigh} pts` });
    return renderRichTooltipHtml({
        title: `Total ${lowText}% – ${highText}% score achieved`,
        rows,
    });
}

/**
 * Assembles the timeline-driven ECharts option: a base option carrying the shared chrome
 * plus one switchable option per interval width. Dragging the native timeline re-bins the
 * distributions; the single-select legend toggles which population is shown.
 *
 * @param allPercents      All runs' score-as-%-of-max values, binned into the All series.
 * @param finishedPercents Finished runs' score-as-%-of-max values, binned into the Finished series.
 * @param totalMax         Instance max score, passed through to the tooltip.
 * @param palette          Theme colours resolved from CSS custom properties.
 * @param selectedIndex    The interval stop to render as selected.
 * @param activeSeries     Which single distribution the legend shows.
 * @returns The combined `{ baseOption, options }` ECharts option for timeline switching.
 */
function buildChartOptions(
    allPercents: readonly number[],
    finishedPercents: readonly number[],
    totalMax: number,
    palette: ChartPalette,
    selectedIndex: number,
    activeSeries: DistributionSeries,
): EChartsCoreOption {
    const { accent, mutedText, gridLine, surface } = palette;

    const perInterval = INTERVALS.map((intervalWidth) => ({
        xAxis: { data: bandLabels(intervalWidth) },
        series: [
            { data: binCounts(allPercents, intervalWidth) },
            { data: binCounts(finishedPercents, intervalWidth) },
        ],
    }));

    const timeline: TimelineComponentOption = {
        axisType: 'category',
        data: INTERVALS.map((intervalWidth) => `${intervalWidth}%`),
        currentIndex: selectedIndex,
        autoPlay: false,
        bottom: 6,
        left: 40,
        right: 40,
        controlStyle: { show: false },
        symbolSize: 11,
        lineStyle: { color: gridLine },
        label: { color: mutedText },
        itemStyle: { color: mutedText },
        checkpointStyle: { color: accent, borderColor: surface },
        emphasis: { label: { color: accent }, itemStyle: { color: accent } },
    };

    return {
        baseOption: {
            timeline,
            grid: { top: 52, right: 28, bottom: 96, left: 52, containLabel: true },
            legend: {
                top: 12,
                data: [ALL_SERIES_NAME, FINISHED_SERIES_NAME],
                selectedMode: 'single',
                selected: {
                    [ALL_SERIES_NAME]: activeSeries === 'all',
                    [FINISHED_SERIES_NAME]: activeSeries === 'finished',
                },
                textStyle: { color: mutedText },
                icon: 'roundRect',
            },
            tooltip: {
                ...richTooltipDefaults(palette),
                axisPointer: { type: 'shadow' },
                formatter: (params: AxisTooltipParam | AxisTooltipParam[]) =>
                    formatBandTooltip(params, totalMax),
            },
            xAxis: {
                type: 'category',
                name: 'Score band (% of max)',
                nameLocation: 'middle',
                nameGap: 30,
                nameTextStyle: { color: mutedText },
                axisLabel: { color: mutedText, hideOverlap: true },
                axisLine: { lineStyle: { color: gridLine } },
                axisTick: { show: false },
            },
            yAxis: {
                type: 'value',
                name: 'Trainees',
                nameTextStyle: { color: mutedText, align: 'left' },
                minInterval: 1,
                axisLabel: { color: mutedText },
                splitLine: { lineStyle: { color: gridLine } },
            },
            series: [
                {
                    type: 'bar',
                    name: ALL_SERIES_NAME,
                    cursor: 'default',
                    barCategoryGap: '36%',
                    itemStyle: { color: accent, borderRadius: [3, 3, 0, 0] },
                },
                {
                    type: 'bar',
                    name: FINISHED_SERIES_NAME,
                    cursor: 'default',
                    barCategoryGap: '36%',
                    itemStyle: { color: FINISHED_COLOR, borderRadius: [3, 3, 0, 0] },
                },
            ],
        },
        options: perInterval,
    };
}

@Component({
    selector: 'crczp-score-attainment-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './score-attainment-chart.component.html',
    styleUrl: './score-attainment-chart.component.scss',
})
export class ScoreAttainmentChartComponent
    extends EchartsChartBase
    implements ChartPanelInputs, CsvExportable<ScoreAttainmentCsvRow>
{
    /** Training instance whose cohort score distributions this chart visualises. */
    readonly instanceId: InputSignal<number> = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);

    /** Resolved instance levels (one-shot), or null until resolution completes. */
    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /** Live source emitting one RunScore per run on the instance. */
    private readonly live: QuerySource<readonly RunScore[]> = createScoreAttainmentSource(
        this.instanceId,
    );

    /** Selected timeline bin-width stop. */
    protected readonly selectedIntervalIndex = signal<number>(DEFAULT_INTERVAL_INDEX);

    /** Population whose score distribution the legend toggle shows. */
    protected readonly selectedSeries = signal<DistributionSeries>('all');

    private chartInstanceRef: ECharts | null = null;

    /** Sum of every level's max score — the denominator for score-as-%-of-max, or null until resolved. */
    private readonly totalMax = computed<number | null>(() => {
        const resolved = this.resolvedLevels();
        if (resolved === null) return null;
        let sum = 0;
        for (const level of resolved.levels) sum += level.maxScore;
        return sum;
    });

    /** Combined view-model: the all-runs and finished-runs score distributions. */
    protected readonly vm = computed<ScoreAttainmentVm | null>(() => {
        const totalMax = this.totalMax();
        if (totalMax === null) return null;
        const runs = this.live.vm() ?? [];
        const allPercents = runs.map((run) => scorePercentOf(run, totalMax));
        const finishedPercents = runs
            .filter((run) => run.state === 'finished')
            .map((run) => scorePercentOf(run, totalMax));
        return { allPercents, finishedPercents, totalMax, runCount: runs.length };
    });

    /** Worst-case status across the live source and the one-shot level resolution. */
    protected readonly status = computed<ChartSourceStatus>(() => {
        const merged = mergeSourceStatuses(
            this.live.status(),
            this.totalMax() === null ? 'loading' : 'ready',
        );
        if (merged !== 'ready' && merged !== 'refreshing') return merged;
        if ((this.vm()?.runCount ?? 0) === 0) return 'empty';
        return merged;
    });

    /** Timeline-driven ECharts option, rebuilt when the data, palette, or selection changes. */
    protected readonly chartOptions = computed<EChartsCoreOption>(() => {
        const viewModel = this.vm();
        return buildChartOptions(
            viewModel?.allPercents ?? [],
            viewModel?.finishedPercents ?? [],
            viewModel?.totalMax ?? 0,
            this.palette(),
            this.selectedIntervalIndex(),
            this.selectedSeries(),
        );
    });

    constructor() {
        super();
        this.configureTimelineScroll(
            () => this.selectedIntervalIndex(),
            () => INTERVALS.length,
            (index) => this.selectedIntervalIndex.set(index),
        );
        effect(() => {
            const index = this.selectedIntervalIndex();
            const series = this.selectedSeries();
            this.chartOptions();
            const chart = this.chartInstanceRef;
            if (chart === null) return;
            chart.dispatchAction({ type: 'timelineChange', currentIndex: index });
            const activeName = series === 'finished' ? FINISHED_SERIES_NAME : ALL_SERIES_NAME;
            const inactiveName = series === 'finished' ? ALL_SERIES_NAME : FINISHED_SERIES_NAME;
            chart.dispatchAction({ type: 'legendSelect', name: activeName });
            chart.dispatchAction({ type: 'legendUnSelect', name: inactiveName });
        });
    }

    /**
     * Captures the ECharts instance and mirrors the native timeline and legend
     * selections back into the component's signals.
     *
     * @param instance The initialised ECharts instance emitted by ngx-echarts.
     */
    protected override onChartInit(instance: ECharts): void {
        super.onChartInit(instance);
        this.chartInstanceRef = instance;
        instance.on('timelinechanged', (event: TimelineChangedEvent) => {
            this.selectedIntervalIndex.set(event.currentIndex);
        });
        instance.on('legendselectchanged', (event: LegendSelectChangedEvent) => {
            this.selectedSeries.set(event.name === FINISHED_SERIES_NAME ? 'finished' : 'all');
        });
    }

    /** @returns File name (without extension) for the downloaded CSV. */
    csvFilename(): string {
        return 'score-attainment';
    }

    /**
     * @returns Column definitions for the CSV export, in output order. One row per run:
     *          trainee identity, absolute and percentage score, completed-level count, and state.
     */
    csvColumns(): ReadonlyArray<CsvColumn<ScoreAttainmentCsvRow>> {
        return [
            { header: 'Trainee', value: (row) => row.trainee },
            { header: 'Login', value: (row) => row.login },
            { header: 'Email', value: (row) => row.email },
            { header: 'Total score', value: (row) => row.totalScore },
            { header: 'Max score', value: (row) => row.maxScore },
            { header: 'Score %', value: (row) => row.scorePercent },
            { header: 'Completed levels', value: (row) => row.completedLevels },
            { header: 'Run state', value: (row) => row.state },
        ];
    }

    /**
     * Resolves trainee display names on demand and returns one CSV row per run. Resolution
     * is deferred to export time so no entity fetches run during polling. Returns an empty
     * list until the level totals resolve. Name falls back from display name to login to id.
     *
     * @returns Promise resolving to one {@link ScoreAttainmentCsvRow} per run.
     */
    async csvRows(): Promise<ReadonlyArray<ScoreAttainmentCsvRow>> {
        const runs = this.live.vm() ?? [];
        const totalMax = this.totalMax();
        if (runs.length === 0 || totalMax === null) return [];
        const ids = [...new Set(runs.map((run) => run.userId))];
        const nameById = await lastValueFrom(this.entityResolver.resolveMap(EntityType.User, ids));
        return runs.map((run): ScoreAttainmentCsvRow => {
            const user = nameById.get(run.userId);
            return {
                trainee: user?.name ?? user?.login ?? String(run.userId),
                login: user?.login ?? '',
                email: user?.mail ?? '',
                totalScore: run.totalScore,
                maxScore: totalMax,
                scorePercent: scorePercentOf(run, totalMax),
                completedLevels: run.completedOrders.length,
                state: run.state,
            };
        });
    }
}
