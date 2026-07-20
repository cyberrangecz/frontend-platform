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
import { EChartsOption, YAXisComponentOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { formatDuration, intervalToDuration } from 'date-fns';
import { lastValueFrom } from 'rxjs';

import { EntityResolverService, EntityType } from '@crczp/event-query-engine';
import { AbstractLevelTypeEnum } from '@crczp/training-model';

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
    LevelBasicView,
    PALETTE,
    renderRichTooltipHtml,
    resolveInstanceLevels,
    richTooltipDefaults,
    RichTooltipModel,
    RichTooltipRow,
    TooltipEntry,
} from '../shared';
import { createTimeVsScoreSource, TimeVsScoreVm } from './time-vs-score-source';

/** One row of the per-level CSV export, indexable by trainee name and handle. */
export interface TimeVsScoreCsvRow {
    readonly traineeName: string;
    readonly handle: string;
    readonly level: number;
    readonly title: string;
    readonly type: string;
    readonly minutes: number | '';
    readonly points: number | '';
    readonly maxPossible: number;
    readonly percentOfMax: number | '';
    readonly pointsPerMinute: number | '';
}

/** One scored level's time spent against points earned, in definition order. */
interface LevelDatum {
    /** Zero-based position of the level in the full definition. */
    readonly order: number;
    readonly title: string;
    readonly typeLabel: string;
    readonly maxScore: number;
    /** Milliseconds spent on the level, or null when not completed (or unmeasurable). */
    readonly durationMs: number | null;
    /** Minutes spent on the level, or null when not completed. */
    readonly minutes: number | null;
    /** Points earned for completing the level, or null when not completed. */
    readonly score: number | null;
    /** Earned points as a percentage of the level max, or null when not completed. */
    readonly percentOfMax: number | null;
    /** Points earned per minute, or null when not completed or no time was measured. */
    readonly efficiency: number | null;
}

const TRAINING_LEVEL_TYPES: ReadonlySet<string> = new Set([
    AbstractLevelTypeEnum.Training,
    'TRAINING',
    'TRAINING_LEVEL',
]);
const ASSESSMENT_LEVEL_TYPES: ReadonlySet<string> = new Set([
    AbstractLevelTypeEnum.Assessment,
    'ASSESSMENT',
    'ASSESSMENT_LEVEL',
]);
const ACCESS_LEVEL_TYPES: ReadonlySet<string> = new Set([
    AbstractLevelTypeEnum.Access,
    'ACCESS',
    'ACCESS_LEVEL',
]);
const INFO_LEVEL_TYPES: ReadonlySet<string> = new Set([
    AbstractLevelTypeEnum.Info,
    'INFO',
    'INFO_LEVEL',
]);

/**
 * Maps a level type string to a human-readable label for tooltips and CSV.
 *
 * @param type  Level type string from level_started, or null when unknown.
 * @returns A capitalised level-type label.
 */
function levelTypeLabel(type: string | null): string {
    if (type !== null && TRAINING_LEVEL_TYPES.has(type)) return 'Training';
    if (type !== null && ASSESSMENT_LEVEL_TYPES.has(type)) return 'Assessment';
    if (type !== null && ACCESS_LEVEL_TYPES.has(type)) return 'Access';
    if (type !== null && INFO_LEVEL_TYPES.has(type)) return 'Info';
    return 'Level';
}

/**
 * Formats a millisecond duration as a coarse two-unit string (e.g. `12m 30s`, `1h 5m`),
 * abbreviating the largest two non-zero units.
 *
 * @param durationMs  Duration in milliseconds.
 * @returns The abbreviated duration string.
 */
function formatDurationCoarse(durationMs: number): string {
    const duration = intervalToDuration({ start: 0, end: Math.max(0, Math.round(durationMs)) });
    const formatted = formatDuration(duration, {
        format: ['days', 'hours', 'minutes', 'seconds'],
        delimiter: ' ',
    });
    if (!formatted) return '0s';
    const parts = formatted.split(' ');
    const abbreviated: string[] = [];
    let index = 0;
    while (index < parts.length && abbreviated.length < 2) {
        const numericPart = parts[index];
        const unitPart = parts[index + 1];
        if (numericPart !== undefined && unitPart !== undefined) {
            abbreviated.push(`${parseInt(numericPart, 10)}${unitPart.replace(/s$/, '').charAt(0)}`);
        }
        index += 2;
    }
    return abbreviated.join(' ');
}

/**
 * Rounds a number to one decimal place.
 *
 * @param value  The number to round.
 * @returns The value rounded to one decimal.
 */
function round1(value: number): number {
    return Math.round(value * 10) / 10;
}

/**
 * Computes a value-axis maximum that always sits strictly above the data maximum, snapped
 * up to a nice step, so the tallest bar or highest point never touches the axis top.
 *
 * @param dataMax  The largest value plotted on the axis.
 * @returns A rounded axis maximum with at least a fraction of a step of headroom.
 */
function axisMaxWithHeadroom(dataMax: number): number {
    if (dataMax <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(dataMax));
    const normalized = dataMax / magnitude;
    const step = (normalized <= 1 ? 0.2 : normalized <= 2 ? 0.5 : normalized <= 5 ? 1 : 2) * magnitude;
    return (Math.floor(dataMax / step) + 1) * step;
}

/**
 * Builds one datum per scored level pairing the run's time spent with the points earned.
 * Time and score are null for levels the run has not completed, so the bar and earned
 * line render only on completed levels while the max line spans every scored level.
 *
 * @param levels  Scored definition levels sorted ascending by order.
 * @param data    The selected run's per-level time, score, and types.
 * @returns One datum per scored level in definition order.
 */
function buildLevelData(
    levels: readonly LevelBasicView[],
    data: TimeVsScoreVm,
): readonly LevelDatum[] {
    return levels.map((level): LevelDatum => {
        const entry = data.byOrder.get(level.order);
        const type = data.typeByOrder.get(level.order) ?? null;
        const durationMs = entry ? entry.durationMs : null;
        const minutes = durationMs === null ? null : durationMs / 60_000;
        const score = entry ? entry.scoreInLevel : null;
        const percentOfMax =
            score !== null && level.maxScore > 0 ? (score / level.maxScore) * 100 : null;
        const efficiency =
            score !== null && minutes !== null && minutes > 0 ? score / minutes : null;
        return {
            order: level.order,
            title: level.title,
            typeLabel: levelTypeLabel(type),
            maxScore: level.maxScore,
            durationMs,
            minutes,
            score,
            percentOfMax,
            efficiency,
        };
    });
}

/**
 * Time spent versus points earned per scored level for one selected run: a dual-axis
 * chart with a time bar (left) and a points-earned line against the per-level maximum
 * (right). Reveals where the run's time converted into score.
 */
@Component({
    selector: 'crczp-time-vs-score-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './time-vs-score-chart.component.html',
    styleUrl: './time-vs-score-chart.component.scss',
})
export class TimeVsScoreChartComponent
    extends EchartsChartBase
    implements ChartPanelInputs, CsvExportable<TimeVsScoreCsvRow>
{
    readonly instanceId: InputSignal<number> = input.required<number>();
    readonly runId: InputSignal<number | null> = input<number | null>(null);

    private readonly entityResolver = inject(EntityResolverService);

    private readonly source = createTimeVsScoreSource(this.instanceId, this.runId);

    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /** Scored levels (max score above zero) in definition order; the chart's x-axis domain. */
    private readonly scoredLevels: Signal<readonly LevelBasicView[]> = computed(() => {
        const resolved = this.resolvedLevels();
        return resolved ? resolved.levels.filter((level) => level.maxScore > 0) : [];
    });

    protected readonly status: Signal<ChartSourceStatus> = computed(() => {
        const resolved = this.resolvedLevels();
        if (resolved === null) return 'loading';
        if (this.source.status() === 'error') return 'error';
        return this.scoredLevels().length === 0 ? 'empty' : 'ready';
    });

    private readonly data: Signal<readonly LevelDatum[]> = computed(() => {
        const vm = this.source.vm();
        const levels = this.scoredLevels();
        if (levels.length === 0) return [];
        return buildLevelData(levels, vm ?? { userId: null, byOrder: new Map(), typeByOrder: new Map() });
    });

    protected readonly chartOptions = computed<EChartsOption>(() => {
        const data = this.data();
        const palette = this.palette();
        const { mutedText, gridLine, surface } = palette;
        const categories = data.map((datum) => datum.title);
        const labelWidth = categoryLabelWidth(this.chartWidth(), categories.length);

        const minutesData = data.map((datum) => (datum.minutes === null ? null : round1(datum.minutes)));
        const earnedData = data.map((datum) => datum.score);
        const maxData = data.map((datum) => datum.maxScore);

        const minutesMax = axisMaxWithHeadroom(
            Math.max(0, ...minutesData.filter((value): value is number => value !== null)),
        );
        const pointsMax = axisMaxWithHeadroom(
            Math.max(0, ...earnedData.filter((value): value is number => value !== null), ...maxData),
        );

        const yAxis = [
            {
                ...baseValueAxisDefaults(palette),
                type: 'value',
                name: 'Minutes',
                position: 'left',
                min: 0,
                max: minutesMax,
                nameLocation: 'middle',
                nameGap: 26,
                nameRotate: 90,
                nameTextStyle: { color: PALETTE.blue.color, align: 'center' },
                minInterval: 1,
                axisLabel: { color: mutedText },
            },
            {
                ...baseValueAxisDefaults(palette),
                type: 'value',
                name: 'Points',
                position: 'right',
                min: 0,
                max: pointsMax,
                nameLocation: 'middle',
                nameGap: 34,
                nameRotate: 90,
                nameTextStyle: { color: PALETTE.orange.color, align: 'center' },
                minInterval: 1,
                splitLine: { show: false },
                axisLabel: { color: mutedText },
            },
        ] as YAXisComponentOption[];

        return {
            animation: false,
            grid: { top: 40, right: 22, bottom: 8, left: 22, containLabel: true },
            legend: {
                top: 8,
                data: ['Minutes spent', 'Points earned', 'Max possible'],
                textStyle: { color: mutedText },
                icon: 'roundRect',
            },
            tooltip: {
                ...richTooltipDefaults(palette),
                formatter: (params: TooltipEntry | TooltipEntry[]) => {
                    const model = this.tooltipModel(params, data);
                    return model ? renderRichTooltipHtml(model) : '';
                },
            },
            xAxis: {
                ...baseCategoryAxisDefaults(palette),
                type: 'category',
                boundaryGap: true,
                data: categories,
                triggerEvent: true,
                axisLabel: {
                    color: mutedText,
                    interval: 0,
                    margin: 10,
                    overflow: 'truncate',
                    width: labelWidth,
                },
            },
            yAxis,
            series: [
                {
                    type: 'bar',
                    name: 'Minutes spent',
                    yAxisIndex: 0,
                    data: minutesData,
                    barMaxWidth: 44,
                    itemStyle: { color: PALETTE.blue.color, borderRadius: [3, 3, 0, 0] },
                    z: 2,
                },
                {
                    type: 'line',
                    name: 'Points earned',
                    yAxisIndex: 1,
                    data: earnedData,
                    connectNulls: false,
                    symbol: 'circle',
                    symbolSize: 9,
                    showSymbol: true,
                    lineStyle: { width: 3, color: PALETTE.orange.color },
                    itemStyle: { color: PALETTE.orange.color, borderColor: surface, borderWidth: 2 },
                    emphasis: { scale: true },
                    z: 4,
                },
                {
                    type: 'line',
                    name: 'Max possible',
                    yAxisIndex: 1,
                    data: maxData,
                    symbol: 'circle',
                    symbolSize: 6,
                    showSymbol: true,
                    lineStyle: { width: 2, color: gridLine, type: 'dashed' },
                    itemStyle: { color: PALETTE.gray.color },
                    z: 3,
                },
            ],
        };
    });

    protected override axisLabels(): readonly string[] {
        return this.data().map((datum) => datum.title);
    }

    csvFilename(): string {
        const runId = this.runId();
        return runId ? `time-vs-score-run-${runId}.csv` : 'time-vs-score.csv';
    }

    csvColumns(): ReadonlyArray<CsvColumn<TimeVsScoreCsvRow>> {
        return [
            { header: 'Trainee', value: (row) => row.traineeName },
            { header: 'Handle', value: (row) => row.handle },
            { header: 'Level', value: (row) => row.level },
            { header: 'Title', value: (row) => row.title },
            { header: 'Type', value: (row) => row.type },
            { header: 'Minutes spent', value: (row) => row.minutes },
            { header: 'Points earned', value: (row) => row.points },
            { header: 'Max possible', value: (row) => row.maxPossible },
            { header: '% of max', value: (row) => row.percentOfMax },
            { header: 'Points/min', value: (row) => row.pointsPerMinute },
        ];
    }

    async csvRows(): Promise<ReadonlyArray<TimeVsScoreCsvRow>> {
        const data = this.data();
        if (data.length === 0) return [];
        const userId = this.source.vm()?.userId ?? null;
        const user =
            userId === null
                ? undefined
                : (await lastValueFrom(this.entityResolver.resolveMap(EntityType.User, [userId]))).get(
                      userId,
                  );
        const traineeName = user?.name ?? user?.login ?? (userId === null ? '' : String(userId));
        const handle = user?.login ?? '';
        return data.map(
            (datum): TimeVsScoreCsvRow => ({
                traineeName,
                handle,
                level: datum.order + 1,
                title: datum.title,
                type: datum.typeLabel,
                minutes: datum.minutes === null ? '' : round1(datum.minutes),
                points: datum.score ?? '',
                maxPossible: datum.maxScore,
                percentOfMax: datum.percentOfMax === null ? '' : Math.round(datum.percentOfMax),
                pointsPerMinute: datum.efficiency === null ? '' : round1(datum.efficiency),
            }),
        );
    }

    /**
     * Renders the axis tooltip for the hovered level, listing the time spent, points
     * earned, the level maximum, percent of max, and efficiency. Levels the run has not
     * completed show only the maximum and a not-completed note.
     *
     * @param params  ECharts tooltip params for the hovered category.
     * @param data    The per-level data backing the chart.
     * @returns The tooltip model, or null for an out-of-range index.
     */
    private tooltipModel(
        params: TooltipEntry | TooltipEntry[],
        data: readonly LevelDatum[],
    ): RichTooltipModel | null {
        const items = Array.isArray(params) ? params : [params];
        const index = items[0]?.dataIndex ?? 0;
        const datum = data[index];
        if (!datum) return null;
        const rows: RichTooltipRow[] = [{ label: 'Type', value: datum.typeLabel }];
        if (datum.score === null) {
            rows.push(
                { label: 'Max possible', value: String(datum.maxScore) },
                { label: 'Status', value: 'Not completed yet' },
            );
            return { title: datum.title, rows };
        }
        rows.push({
            label: 'Time spent',
            value: datum.durationMs === null ? '—' : formatDurationCoarse(datum.durationMs),
        });
        rows.push({ label: 'Points earned', value: String(datum.score) });
        rows.push({ label: 'Max possible', value: String(datum.maxScore) });
        rows.push({
            label: '% of max',
            value: datum.percentOfMax === null ? '—' : `${Math.round(datum.percentOfMax)}%`,
        });
        rows.push({
            label: 'Efficiency',
            value: datum.efficiency === null ? '—' : `${round1(datum.efficiency)} pts/min`,
        });
        return { title: datum.title, rows };
    }
}
