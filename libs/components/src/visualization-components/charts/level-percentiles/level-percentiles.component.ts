import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BarSeriesOption, EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';

import { EntityResolverService } from '@crczp/event-query-engine';
import { AbstractLevelTypeEnum, AssessmentTypeEnum } from '@crczp/training-model';

import {
    categoryLabelWidth,
    ChartPanelInputs,
    ChartPanelShellComponent,
    ChartSourceStatus,
    ECHARTS_CORE_PROVIDER,
    EchartsChartBase,
    formatClock,
    isRunSelected,
    LevelBasicView,
    PALETTE,
    renderRichTooltipHtml,
    resolveInstanceLevels,
    richTooltipDefaults,
    RichTooltipRow,
} from '../shared';
import {
    createTraineeOverviewSource,
    TraineeLevelRaw,
    TraineeRawRow,
} from '../trainee-overview/trainee-overview-source';

/** Bar color for the score-percentile series. */
const SCORE_COLOR = PALETTE.blue.color;
/** Bar color for the time-percentile series. */
const TIME_COLOR = PALETTE.emerald.color;
/** Font size in pixels of the per-bar percentile labels. */
const BAR_LABEL_FONT_SIZE = 11;
/** Widest a single bar is ever drawn, in pixels, so paired bars stay slim on tall panels. */
const BAR_MAX_WIDTH = 13;
/** Percentile assigned when the comparison set is empty (sole completer leads the field). */
const SOLE_COMPLETER_PERCENTILE = 100;

/** One graded level's standing for the highlighted run against the level's completers. */
interface LevelPercentileRow {
    /** Zero-based level order, matching the per-run level aggregates. */
    readonly order: number;
    /** Level display title, used as the category-axis label. */
    readonly title: string;
    /** Maximum attainable score on the level. */
    readonly maxScore: number;
    /** Whether the highlighted run completed this level. */
    readonly completed: boolean;
    /** Percent of other completers this run strictly out-scored, or 0 when not completed. */
    readonly scorePercentile: number;
    /** Percent of other completers this run was strictly faster than, or 0 when not completed. */
    readonly timePercentile: number;
    /** This run's score on the level, or null when not completed. */
    readonly currentScore: number | null;
    /** This run's time on the level in milliseconds, or null when not completed or untimed. */
    readonly currentTimeMs: number | null;
    /** Number of runs that completed this level, disclosed so thin cohorts are visible. */
    readonly cohortSize: number;
}

/** Structural shape of one entry ECharts passes to the axis-trigger tooltip formatter. */
interface AxisTooltipParam {
    readonly dataIndex?: number;
}

/**
 * Whether a level is graded, i.e. contributes a score a percentile can rank. A training level is
 * always graded; an assessment level only when its assessment type is a scored test, never a
 * questionnaire; info and access levels never are.
 *
 * @param level The resolved level to classify.
 * @returns True when the level carries a rankable score.
 */
function isGradedLevel(level: LevelBasicView): boolean {
    if (level.type === AbstractLevelTypeEnum.Training) return true;
    return level.type === AbstractLevelTypeEnum.Assessment && level.assessmentType === AssessmentTypeEnum.Test;
}

/**
 * Elapsed time spent on a level in milliseconds, or null when either boundary timestamp is
 * missing or the completion precedes the entry.
 *
 * @param level The per-run level aggregate to measure.
 * @returns The non-negative duration in milliseconds, or null when it cannot be derived.
 */
function levelTimeMs(level: TraineeLevelRaw): number | null {
    if (level.startedTimestamp === null || level.completedTimestamp === null) return null;
    const elapsed = level.completedTimestamp - level.startedTimestamp;
    return elapsed >= 0 ? elapsed : null;
}

/**
 * Strictly-beat percentile: the percent of the comparison set the current value outranks, with
 * self excluded from both sides. Ties never count. An empty comparison set yields the
 * sole-completer default rather than dividing by zero.
 *
 * @param currentValue  The highlighted run's value on the level.
 * @param others        The comparison set (other completers' values).
 * @param higherIsBetter True when a larger value ranks higher (score); false when smaller does (time).
 * @returns The percentile in the range 0–100.
 */
function strictlyBeatPercentile(
    currentValue: number,
    others: readonly number[],
    higherIsBetter: boolean,
): number {
    if (others.length === 0) return SOLE_COMPLETER_PERCENTILE;
    const beaten = others.filter((value) =>
        higherIsBetter ? value < currentValue : value > currentValue,
    ).length;
    return (beaten / others.length) * 100;
}

/**
 * Score-and-time percentile-per-level chart for the trainee feedback dashboard: horizontal grouped
 * bars placing the highlighted run against the cohort on every graded level, where higher is always
 * better. Score ranks the run's per-level score among that level's completers; time ranks its
 * per-level speed (faster is higher). The per-level counterpart to the overall speed-vs-score chart.
 */
@Component({
    selector: 'crczp-level-percentiles',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './level-percentiles.component.html',
    styleUrl: './level-percentiles.component.scss',
})
export class LevelPercentilesComponent extends EchartsChartBase implements ChartPanelInputs {
    readonly instanceId: InputSignal<number> = input.required<number>();
    readonly runId: InputSignal<number | null> = input<number | null>(null);

    private readonly entityResolver = inject(EntityResolverService);

    private readonly source = createTraineeOverviewSource(this.instanceId, this.entityResolver);

    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /** Graded levels of the instance in defined order; empty until the definition resolves. */
    private readonly gradedLevels: Signal<readonly LevelBasicView[]> = computed(() => {
        const resolved = this.resolvedLevels();
        if (!resolved) return [];
        return resolved.levels.filter(isGradedLevel);
    });

    /** Per-graded-level standing of the highlighted run; empty until data and levels land. */
    private readonly rows: Signal<readonly LevelPercentileRow[]> = computed(() => {
        const graded = this.gradedLevels();
        const data = this.source.vm();
        const currentRunId = this.runId();
        if (graded.length === 0 || !data || !isRunSelected(currentRunId)) return [];
        const currentRow = data.find((row) => row.runId === currentRunId) ?? null;
        return graded.map((level) => this.buildRow(level, data, currentRow, currentRunId));
    });

    protected readonly status: Signal<ChartSourceStatus> = computed(() => {
        if (this.resolvedLevels() === null) return 'loading';
        const sourceStatus = this.source.status();
        if (sourceStatus === 'error') return 'error';
        if (sourceStatus === 'idle' || sourceStatus === 'loading') return 'loading';
        return this.rows().length === 0 ? 'empty' : 'ready';
    });

    protected readonly emptyMessage: Signal<string> = computed(() =>
        isRunSelected(this.runId()) ? 'No graded levels to rank' : 'Select a run to rank its levels',
    );

    protected readonly chartOptions = computed<EChartsOption>(() => {
        const palette = this.palette();
        const { mutedText, gridLine } = palette;
        const rows = this.rows();
        const labelWidth = categoryLabelWidth(this.chartWidth(), rows.length);

        return {
            animation: false,
            grid: { top: 32, right: 30, bottom: 40, left: 8, containLabel: true },
            legend: {
                data: ['score', 'time'],
                top: 0,
                right: 0,
                icon: 'roundRect',
                itemWidth: 10,
                itemHeight: 10,
                textStyle: { color: mutedText },
            },
            tooltip: {
                ...richTooltipDefaults(palette),
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: (params: unknown) => {
                    const list = Array.isArray(params) ? params : [params];
                    const first = list[0] as AxisTooltipParam | undefined;
                    if (!first || first.dataIndex === undefined) return '';
                    const row = rows[first.dataIndex];
                    if (!row) return '';
                    return renderRichTooltipHtml({ title: row.title, rows: tooltipRows(row) });
                },
            },
            xAxis: {
                type: 'value',
                name: 'percentile',
                nameLocation: 'middle',
                nameGap: 28,
                nameTextStyle: { color: mutedText },
                min: 0,
                max: 100,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: gridLine } },
                axisLabel: { color: mutedText },
            },
            yAxis: {
                type: 'category',
                inverse: true,
                data: rows.map((row) => row.title),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: mutedText, width: labelWidth, overflow: 'truncate' },
            },
            series: [
                this.barSeries('score', SCORE_COLOR, rows, (row) => row.scorePercentile),
                this.barSeries('time', TIME_COLOR, rows, (row) => row.timePercentile),
            ],
        };
    });

    /**
     * Builds one level's standing by ranking the highlighted run against every run that completed
     * that level. A level the run did not complete bypasses the percentile math and is reported at
     * zero on both metrics, flagged as not completed.
     *
     * @param level         The graded level to rank.
     * @param data          All runs of the instance.
     * @param currentRow    The highlighted run's row, or null when it is absent from the data.
     * @param currentRunId  Identifier of the highlighted run, used to exclude it from the cohort.
     * @returns The level's percentile standing for the highlighted run.
     */
    private buildRow(
        level: LevelBasicView,
        data: readonly TraineeRawRow[],
        currentRow: TraineeRawRow | null,
        currentRunId: number,
    ): LevelPercentileRow {
        const order = level.order;
        const current = currentRow?.levels.find((entry) => entry.levelOrder === order) ?? null;
        const completed = current !== null && current.completedTimestamp !== null && current.completedScore !== null;
        const currentScore = completed ? (current as TraineeLevelRaw).completedScore : null;
        const currentTimeMs = completed ? levelTimeMs(current as TraineeLevelRaw) : null;

        const otherScores: number[] = [];
        const otherTimes: number[] = [];
        let cohortSize = 0;
        for (const row of data) {
            const entry = row.levels.find((candidate) => candidate.levelOrder === order);
            if (!entry || entry.completedTimestamp === null || entry.completedScore === null) continue;
            cohortSize += 1;
            if (row.runId === currentRunId) continue;
            otherScores.push(entry.completedScore);
            const time = levelTimeMs(entry);
            if (time !== null) otherTimes.push(time);
        }

        return {
            order,
            title: level.title,
            maxScore: level.maxScore,
            completed,
            scorePercentile: completed ? Math.round(strictlyBeatPercentile(currentScore as number, otherScores, true)) : 0,
            timePercentile:
                completed && currentTimeMs !== null
                    ? Math.round(strictlyBeatPercentile(currentTimeMs, otherTimes, false))
                    : 0,
            currentScore,
            currentTimeMs,
            cohortSize,
        };
    }

    /**
     * Builds one percentile bar series with per-bar labels: completed levels label the numeric
     * percentile in the series color, while a level this run did not complete carries a single
     * muted "not completed" note on the score series and no label on the time series.
     *
     * @param name  Series name and legend entry ('score' or 'time').
     * @param color Bar and label color for completed levels.
     * @param rows  The per-level standings driving the bars, index-aligned with the category axis.
     * @param pick  Selects the metric's percentile from a row.
     * @returns The configured horizontal bar series.
     */
    private barSeries(
        name: 'score' | 'time',
        color: string,
        rows: readonly LevelPercentileRow[],
        pick: (row: LevelPercentileRow) => number,
    ): BarSeriesOption {
        const mutedText = this.palette().mutedText;
        return {
            type: 'bar',
            name,
            barMaxWidth: BAR_MAX_WIDTH,
            itemStyle: { color, borderRadius: [0, 3, 3, 0] },
            data: rows.map((row) => ({
                value: pick(row),
                label: barLabel(row, name, color, mutedText),
            })),
        };
    }
}

/**
 * Per-bar label for one metric on one level. Completed levels show the numeric percentile in the
 * series color; a not-completed level shows a single muted "not completed" note on the score
 * series and nothing on the time series so the row reads once, not twice.
 *
 * @param row       The level's standing.
 * @param name      Which metric series this label belongs to.
 * @param color     The series color for completed labels.
 * @param mutedText Muted color for the not-completed note.
 * @returns The ECharts label configuration for the bar.
 */
function barLabel(
    row: LevelPercentileRow,
    name: 'score' | 'time',
    color: string,
    mutedText: string,
): BarSeriesOption['label'] {
    if (row.completed) {
        const value = name === 'score' ? row.scorePercentile : row.timePercentile;
        return { show: true, position: 'right', color, fontSize: BAR_LABEL_FONT_SIZE, formatter: `${value}` };
    }
    if (name === 'score') {
        return { show: true, position: 'right', color: mutedText, fontSize: BAR_LABEL_FONT_SIZE, formatter: 'not completed' };
    }
    return { show: false };
}

/**
 * Rich-tooltip rows for one level: score and time with their percentiles when completed, a
 * not-completed status otherwise, and always the count of runs that completed the level.
 *
 * @param row The level's standing.
 * @returns The label/value rows for the rich tooltip.
 */
function tooltipRows(row: LevelPercentileRow): RichTooltipRow[] {
    const cohort: RichTooltipRow = { label: 'Completed by', value: `${row.cohortSize} runs` };
    if (!row.completed) {
        return [{ label: 'Status', value: 'not completed' }, cohort];
    }
    return [
        { label: 'Score', value: `${row.currentScore}/${row.maxScore}`, valueColor: SCORE_COLOR },
        { label: 'Score percentile', value: `${row.scorePercentile}`, valueColor: SCORE_COLOR },
        { label: 'Time', value: row.currentTimeMs !== null ? formatClock(row.currentTimeMs) : '—', valueColor: TIME_COLOR },
        { label: 'Time percentile', value: `${row.timePercentile}`, valueColor: TIME_COLOR },
        cohort,
    ];
}
