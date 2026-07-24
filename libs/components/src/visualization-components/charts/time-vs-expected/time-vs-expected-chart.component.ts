import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EChartsOption } from 'echarts';
import { ECharts } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { lastValueFrom } from 'rxjs';

import { EntityResolverService, EntityType } from '@crczp/event-query-engine';

import {
    baseCategoryAxisDefaults,
    baseValueAxisDefaults,
    categoryLabelWidth,
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
    richTooltipDefaults,
    RichTooltipRow,
    TooltipEntry,
} from '../shared';
import { resolveTrainingLevels } from '../level-difficulty/level-difficulty-source';
import { computeLevelTimings, LevelTiming, OUTLIER_CAP_MEDIAN_MULTIPLE } from './time-vs-expected.compute';
import {
    createTimeVsExpectedSource,
    EMPTY_TIME_VS_EXPECTED_DATA,
    TimeVsExpectedAggregate,
} from './time-vs-expected-source';

/** One row of the per-run CSV export: one completed level visit. */
export interface TimeVsExpectedCsvRow {
    readonly traineeId: number;
    readonly trainee: string;
    readonly email: string;
    readonly level: string;
    readonly estimateMinutes: number;
    readonly actualMinutes: number;
    readonly deviationMinutes: number;
}

const SERIES_STEM = 'Deviation';
const SERIES_RUNS = 'Individual runs';

/** Resolves the over/under colour for a signed deviation: red over estimate, green under. */
function deviationColor(deviation: number): string {
    return deviation >= 0 ? PALETTE.red.color : PALETTE.green.color;
}

/** Maximum jitter offset, as a fraction of a category width to either side of centre. */
const JITTER_WIDTH = 0.36;

/**
 * Deterministic pseudo-random unit value in [0, 1) for a numeric seed, so identical
 * sample sets always produce the same scatter rather than reshuffling on each render.
 *
 * @param seed Arbitrary numeric seed.
 * @returns A value in the half-open range [0, 1).
 */
function pseudoRandomUnit(seed: number): number {
    const x = Math.sin(seed) * 43758.5453;
    return x - Math.floor(x);
}

/**
 * Computes a continuous horizontal jitter offset per sample (in category-width
 * fractions) so a level's individual-run dots spread across the band instead of
 * stacking in one column. Offsets are deterministic for a given sample set.
 *
 * @param values Actual completion times for one level, in minutes.
 * @returns Offsets aligned to `values`, each added to the level's category index.
 */
function jitterOffsets(values: readonly number[]): number[] {
    return values.map(
        (value, index) => (pseudoRandomUnit(value * 12.9898 + index * 78.233) - 0.5) * 2 * JITTER_WIDTH,
    );
}

/** Rounds a minute value to one decimal place for display. */
function roundMinutes(value: number): number {
    return Math.round(value * 10) / 10;
}

/** Formats a signed deviation in minutes, or 'on estimate' for zero. */
function formatDelta(deviationMinutes: number): string {
    const rounded = roundMinutes(deviationMinutes);
    if (rounded === 0) return 'on estimate';
    return `${rounded > 0 ? '+' : ''}${rounded} min`;
}

/**
 * "Time vs expected per level" panel using the deviation-lollipop encoding. The authored
 * estimate is a flat zero baseline; each level's stem and head show how far the median
 * actual completion time (started → completed) misses it (+over / −under), coloured by
 * direction, over a jittered swarm of individual runs. The tooltip carries quartiles,
 * range, mean, and IQR. Levels nobody has completed keep their place with no lollipop.
 */
@Component({
    selector: 'crczp-time-vs-expected-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './time-vs-expected-chart.component.html',
    styleUrl: './time-vs-expected-chart.component.scss',
})
export class TimeVsExpectedChartComponent
    extends EchartsChartBase
    implements ChartPanelInputs, CsvExportable<TimeVsExpectedCsvRow>
{
    /** Training instance whose per-level timing this chart visualises. */
    readonly instanceId: InputSignal<number> = input.required<number>();

    /** Panel info-tooltip text, reflecting the configured outlier-cap ceiling. */
    protected readonly chartInfo =
        'Median actual completion time per level (started → completed) versus the authored estimate, ' +
        `over a swarm of individual runs. Times beyond ${OUTLIER_CAP_MEDIAN_MULTIPLE * 100}% of a level's ` +
        "median are capped to that ceiling so a trainee who stepped away mid-level doesn't skew the spread.";

    private readonly entityResolver = inject(EntityResolverService);

    /** Ordered training levels with their authored estimates; null until resolved. */
    private readonly meta = toSignal(resolveTrainingLevels(this.instanceId, this.entityResolver), {
        initialValue: null,
    });

    /** One-shot source of raw level-started/level-completed rows for the instance. */
    private readonly source: QuerySource<TimeVsExpectedAggregate> = createTimeVsExpectedSource(this.instanceId);

    /** Per-level timings joining authored estimates with paired actual durations. */
    protected readonly vm = computed<readonly LevelTiming[] | null>(() => {
        const meta = this.meta();
        if (meta === null) return null;
        const aggregate = this.source.vm() ?? EMPTY_TIME_VS_EXPECTED_DATA;
        return computeLevelTimings(meta, aggregate);
    });

    /** Worst-case status across the level resolver and the duration source. */
    protected readonly status = computed<ChartSourceStatus>(() => {
        const merged = mergeSourceStatuses(this.source.status(), this.meta() === null ? 'loading' : 'ready');
        if (merged !== 'ready' && merged !== 'refreshing') return merged;
        const levels = this.vm();
        if (!levels || levels.length === 0) return 'empty';
        return merged;
    });

    /**
     * Captures the ECharts instance and pins the hover cursor to the default arrow,
     * since none of this chart's marks are clickable.
     *
     * @param instance The initialised ECharts instance emitted by ngx-echarts.
     */
    protected override onChartInit(instance: ECharts): void {
        super.onChartInit(instance);
        this.pinDefaultCursor(instance);
    }

    /**
     * ECharts option for the lollipop chart, rebuilt when the view-model or the theme
     * palette changes. A thin bar plus a head dot form each lollipop at the level's
     * median deviation from estimate; a zero mark-line marks the estimate; a jittered
     * swarm shows run spread. Levels with no completed runs draw neither bar nor dots.
     */
    protected readonly chartOptions = computed<EChartsOption>(() => {
        const palette = this.palette();
        const estimateColor = PALETTE.orange.color;
        const levels = this.vm() ?? [];
        const labelWidth = categoryLabelWidth(this.chartWidth(), levels.length);

        const deviations = levels.map((level) =>
            level.stats.median === null ? null : level.stats.median - level.estimateMinutes,
        );
        const headDots = levels.flatMap((level, index) => {
            if (level.stats.median === null) return [];
            const deviation = level.stats.median - level.estimateMinutes;
            return [{ value: [index, deviation], label: { color: deviationColor(deviation) } }];
        });
        const runDots = levels.flatMap((level, index) => {
            const offsets = jitterOffsets(level.samplesMinutes);
            return level.samplesMinutes.map((value, sampleIndex) => [
                index + (offsets[sampleIndex] ?? 0),
                value - level.estimateMinutes,
            ]);
        });

        return {
            animation: false,
            grid: { top: 24, right: 40, bottom: 8, left: 56, containLabel: true },
            tooltip: {
                ...richTooltipDefaults(palette),
                axisPointer: { type: 'none' },
                formatter: (params: TooltipEntry | TooltipEntry[]) => {
                    const items = Array.isArray(params) ? params : [params];
                    const [first] = items;
                    const level = levels.find((entry) => entry.title === String(first?.name));
                    if (!level) return '';
                    const rows: RichTooltipRow[] = [
                        { label: 'Estimate', value: `${roundMinutes(level.estimateMinutes)} min` },
                    ];
                    if (level.stats.count === 0 || level.stats.median === null) {
                        rows.push({ label: 'Status', value: 'No completed runs yet' });
                        return renderRichTooltipHtml({ title: level.title, rows });
                    }
                    const stats = level.stats;
                    const deltaLabel = formatDelta(stats.median - level.estimateMinutes);
                    rows.push(
                        { label: 'Median', value: `${roundMinutes(stats.median)} min (${deltaLabel} vs estimate)` },
                        {
                            label: 'Q1 / Q3',
                            value: `${roundMinutes(stats.q1 ?? 0)} / ${roundMinutes(stats.q3 ?? 0)} min (IQR ${roundMinutes((stats.q3 ?? 0) - (stats.q1 ?? 0))})`,
                        },
                        { label: 'Range', value: `${roundMinutes(stats.min ?? 0)}–${roundMinutes(stats.max ?? 0)} min` },
                        { label: 'Mean', value: `${roundMinutes(stats.mean ?? 0)} min · ${stats.count} runs` },
                    );
                    if (level.cappedCount > 0) {
                        const plural = level.cappedCount === 1 ? '' : 's';
                        rows.push({
                            label: 'Capped',
                            value: `${level.cappedCount} run${plural} at ${OUTLIER_CAP_MEDIAN_MULTIPLE * 100}% of median`,
                        });
                    }
                    return renderRichTooltipHtml({ title: level.title, rows });
                },
            },
            xAxis: [
                {
                    ...baseCategoryAxisDefaults(palette),
                    boundaryGap: true,
                    data: levels.map((level) => level.title),
                    triggerEvent: true,
                    axisLabel: { color: palette.mutedText, interval: 0, margin: 10, overflow: 'truncate', width: labelWidth },
                },
                {
                    type: 'value',
                    show: false,
                    min: -0.5,
                    max: levels.length > 0 ? levels.length - 0.5 : 0.5,
                },
            ] as EChartsOption['xAxis'],
            yAxis: {
                ...baseValueAxisDefaults(palette),
                name: 'Actual − estimate (min)',
                nameGap: 18,
                nameTextStyle: { color: palette.mutedText, align: 'left' },
                axisLabel: {
                    color: palette.mutedText,
                    formatter: (value: number) => (value > 0 ? `+${value}` : `${value}`),
                },
            } as EChartsOption['yAxis'],
            series: [
                {
                    type: 'scatter',
                    name: SERIES_RUNS,
                    xAxisIndex: 1,
                    symbol: 'circle',
                    symbolSize: 7,
                    itemStyle: {
                        color: (params: { value: unknown }) =>
                            deviationColor(Array.isArray(params.value) ? Number(params.value[1]) : 0),
                        opacity: 0.5,
                    },
                    data: runDots,
                    z: 3,
                },
                {
                    type: 'bar',
                    name: SERIES_STEM,
                    barWidth: 4,
                    itemStyle: { color: (params: { value: unknown }) => deviationColor(Number(params.value)) },
                    data: deviations,
                    z: 4,
                    markLine: {
                        symbol: 'none',
                        silent: true,
                        data: [{ yAxis: 0 }],
                        lineStyle: { color: estimateColor, type: 'dashed', width: 2 },
                        label: { show: true, position: 'insideEndTop', formatter: 'estimate', color: estimateColor },
                    },
                },
                {
                    type: 'scatter',
                    name: SERIES_STEM,
                    symbol: 'circle',
                    symbolSize: 16,
                    itemStyle: {
                        color: (params: { value: unknown }) =>
                            deviationColor(Array.isArray(params.value) ? Number(params.value[1]) : 0),
                        opacity: 1,
                        borderColor: palette.surface,
                        borderWidth: 2,
                    },
                    label: {
                        show: true,
                        position: 'right',
                        formatter: (entry: { value: unknown }) => {
                            if (!Array.isArray(entry.value)) return '';
                            const deviation = roundMinutes(Number(entry.value[1]));
                            return deviation > 0 ? `+${deviation}` : `${deviation}`;
                        },
                        fontSize: 14,
                        fontWeight: 'bold',
                        textBorderColor: palette.surface,
                        textBorderWidth: 3,
                    },
                    data: headDots,
                    z: 6,
                },
            ],
        };
    });

    /**
     * Returns the x-axis category labels so the inherited hover handler can map a
     * hovered (possibly truncated) label back to its data index for tooltip dispatch.
     *
     * @returns Ordered level title strings matching the x-axis `data` array.
     */
    protected override axisLabels(): readonly string[] {
        return this.vm()?.map((level) => level.title) ?? [];
    }

    /** @returns File name (without extension) for the downloaded CSV. */
    csvFilename(): string {
        return 'time-vs-expected-per-level';
    }

    /**
     * @returns Column definitions for the CSV export, in output order. One row per
     *          completed level visit: trainee identity, the level, its estimate, the
     *          actual time, and the signed deviation — all in minutes.
     */
    csvColumns(): ReadonlyArray<CsvColumn<TimeVsExpectedCsvRow>> {
        return [
            { header: 'Trainee ID', value: (row) => row.traineeId },
            { header: 'Trainee', value: (row) => row.trainee },
            { header: 'Email', value: (row) => row.email },
            { header: 'Level', value: (row) => row.level },
            { header: 'Estimate (min)', value: (row) => row.estimateMinutes },
            { header: 'Actual (min)', value: (row) => row.actualMinutes },
            { header: 'Deviation (min)', value: (row) => row.deviationMinutes },
        ];
    }

    /**
     * Resolves trainee display names on demand and returns one CSV row per completed
     * level visit. Resolution is deferred to export time so no entity fetches run during
     * the chart's queries. Trainee name falls back from display name to login to id.
     *
     * @returns Promise resolving to one {@link TimeVsExpectedCsvRow} per completed visit.
     */
    async csvRows(): Promise<ReadonlyArray<TimeVsExpectedCsvRow>> {
        const levels = this.vm() ?? [];
        const visits = levels.flatMap((level) => level.runs.map((run) => ({ run, level })));
        if (visits.length === 0) return [];
        const ids = [...new Set(visits.map((visit) => visit.run.userId))];
        const nameById = await lastValueFrom(this.entityResolver.resolveMap(EntityType.User, ids));
        return visits.map(({ run, level }): TimeVsExpectedCsvRow => {
            const user = nameById.get(run.userId);
            return {
                traineeId: run.userId,
                trainee: user?.name ?? user?.login ?? String(run.userId),
                email: user?.mail ?? '',
                level: level.title,
                estimateMinutes: roundMinutes(level.estimateMinutes),
                actualMinutes: roundMinutes(run.actualMinutes),
                deviationMinutes: roundMinutes(run.actualMinutes - level.estimateMinutes),
            };
        });
    }
}
