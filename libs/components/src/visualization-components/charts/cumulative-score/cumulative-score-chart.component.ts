import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    Signal,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EChartsOption, LineSeriesOption } from 'echarts';
import { ECharts } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
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
import { createCumulativeScoreSource, CumulativeScoreVm } from './cumulative-score-source';

/** One row of the per-level CSV export, indexable by trainee name and handle. */
export interface CumulativeScoreCsvRow {
    readonly traineeName: string;
    readonly handle: string;
    readonly level: number;
    readonly title: string;
    readonly type: string;
    readonly levelMax: number;
    readonly cumulativeMax: number;
    readonly gainedThisLevel: number | '';
    readonly actualCumulative: number | '';
    readonly gap: number | '';
}

/** One x-axis level point pairing the actual cumulative score with the global max ceiling. */
interface LevelPoint {
    readonly title: string;
    readonly typeLabel: string;
    readonly color: string;
    readonly maxScore: number;
    readonly cumulativeMax: number;
    readonly actualCumulative: number | null;
    readonly gainedThisLevel: number | null;
    readonly gap: number | null;
}

const ORIGIN_LABEL = 'Start';

/** One axis entry of an ECharts `updateAxisPointer` event payload. */
interface AxisPointerInfo {
    readonly axisDim?: string;
    readonly value?: number | string;
}

/** Minimal structural shape of the ECharts `updateAxisPointer` event payload. */
interface AxisPointerEvent {
    readonly axesInfo?: ReadonlyArray<AxisPointerInfo>;
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
 * Maps a level type string to its semantic marker colour. Training, Assessment and
 * Access each get a distinct palette colour; Info and unknown types fall back to gray.
 *
 * @param type  Level type string from level_started, or null when unknown.
 * @returns The palette hex colour for the level type.
 */
function levelTypeColor(type: string | null): string {
    if (type !== null && TRAINING_LEVEL_TYPES.has(type)) return PALETTE.blue.color;
    if (type !== null && ASSESSMENT_LEVEL_TYPES.has(type)) return PALETTE.orange.color;
    if (type !== null && ACCESS_LEVEL_TYPES.has(type)) return PALETTE.navy.color;
    return PALETTE.gray.color;
}

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
 * Builds the per-level points for a run: the rising global max ceiling and the run's
 * actual cumulative score at each completed level. Actual is null for levels the run
 * has not completed, so the actual line terminates at the last completed level.
 *
 * @param levels  Definition levels sorted ascending by order.
 * @param data    The selected run's completion scores and level types.
 * @returns One point per level in definition order.
 */
function buildLevelPoints(
    levels: readonly LevelBasicView[],
    data: CumulativeScoreVm,
): readonly LevelPoint[] {
    let cumulativeMax = 0;
    let previousActual = 0;
    return levels.map((level): LevelPoint => {
        cumulativeMax += level.maxScore;
        const completed = data.completedByOrder.get(level.order);
        const type = data.typeByOrder.get(level.order) ?? null;
        const actualCumulative = completed ? completed.cumulativeScore : null;
        const gainedThisLevel = actualCumulative === null ? null : actualCumulative - previousActual;
        if (actualCumulative !== null) previousActual = actualCumulative;
        return {
            title: level.title,
            typeLabel: levelTypeLabel(type),
            color: levelTypeColor(type),
            maxScore: level.maxScore,
            cumulativeMax,
            actualCumulative,
            gainedThisLevel,
            gap: actualCumulative === null ? null : cumulativeMax - actualCumulative,
        };
    });
}

/**
 * Cumulative score progression for one selected run: the actual cumulative score at
 * each completed level against the training's global penalty-free max ceiling.
 */
@Component({
    selector: 'crczp-cumulative-score-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './cumulative-score-chart.component.html',
    styleUrl: './cumulative-score-chart.component.scss',
})
export class CumulativeScoreChartComponent
    extends EchartsChartBase
    implements ChartPanelInputs, CsvExportable<CumulativeScoreCsvRow>
{
    readonly instanceId: InputSignal<number> = input.required<number>();
    readonly runId: InputSignal<number | null> = input<number | null>(null);

    private readonly entityResolver = inject(EntityResolverService);

    private readonly source = createCumulativeScoreSource(this.instanceId, this.runId);

    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    protected readonly status: Signal<ChartSourceStatus> = computed(() => {
        const resolved = this.resolvedLevels();
        if (resolved === null) return 'loading';
        if (this.source.status() === 'error') return 'error';
        return resolved.levels.length === 0 ? 'empty' : 'ready';
    });

    private readonly points: Signal<readonly LevelPoint[]> = computed(() => {
        const data = this.source.vm();
        const resolved = this.resolvedLevels();
        if (!data || !resolved) return [];
        return buildLevelPoints(resolved.levels, data);
    });

    /** Category index the axis pointer is over, or null when not hovering. */
    private readonly hoveredIndex = signal<number | null>(null);

    protected readonly chartOptions = computed<EChartsOption>(() => {
        const points = this.points();
        const palette = this.palette();
        const { accent, mutedText, gridLine } = palette;
        const categories = [ORIGIN_LABEL, ...points.map((point) => point.title)];
        const labelWidth = categoryLabelWidth(this.chartWidth(), categories.length);

        const actualData = [
            { value: 0 as number | null, itemStyle: { color: mutedText } },
            ...points.map((point) => ({ value: point.actualCumulative, itemStyle: { color: point.color } })),
        ];
        const maxData = [0, ...points.map((point) => point.cumulativeMax)];
        const gapMarkLine = this.buildGapMarkLine(points, categories);

        return {
            animation: false,
            grid: { top: 48, right: 48, bottom: 8, left: 56, containLabel: true },
            legend: {
                top: 8,
                data: ['Actual score', 'Max possible'],
                textStyle: { color: mutedText },
                icon: 'roundRect',
            },
            tooltip: {
                ...richTooltipDefaults(palette),
                formatter: (params: TooltipEntry | TooltipEntry[]) => {
                    const model = this.tooltipModel(params, points);
                    return model ? renderRichTooltipHtml(model) : '';
                },
            },
            xAxis: {
                ...baseCategoryAxisDefaults(palette),
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
            yAxis: {
                ...baseValueAxisDefaults(palette),
                name: 'Cumulative score',
                nameGap: 18,
                nameTextStyle: { color: mutedText, align: 'left' },
                minInterval: 1,
            },
            series: [
                {
                    type: 'line',
                    name: 'Actual score',
                    data: actualData,
                    connectNulls: false,
                    symbol: 'circle',
                    symbolSize: 9,
                    showSymbol: true,
                    lineStyle: { width: 3, color: accent },
                    itemStyle: { borderColor: palette.surface, borderWidth: 2 },
                    emphasis: { scale: true },
                    z: 3,
                    ...(gapMarkLine ? { markLine: gapMarkLine } : {}),
                },
                {
                    type: 'line',
                    name: 'Max possible',
                    data: maxData,
                    symbol: 'circle',
                    symbolSize: 7,
                    showSymbol: true,
                    lineStyle: { width: 2, color: gridLine, type: 'dashed' },
                    itemStyle: { color: PALETTE.gray.color },
                    z: 2,
                },
            ],
        };
    });

    protected override axisLabels(): readonly string[] {
        return [ORIGIN_LABEL, ...this.points().map((point) => point.title)];
    }

    protected override onChartInit(instance: ECharts): void {
        super.onChartInit(instance);
        instance.on('updateAxisPointer', (event) =>
            this.hoveredIndex.set(this.resolveHoverIndex(event as AxisPointerEvent)),
        );
        instance.on('globalout', () => this.hoveredIndex.set(null));
    }

    /**
     * Resolves the hovered category index from an `updateAxisPointer` event, mapping a
     * category label back to its index when the pointer reports a label rather than an index.
     *
     * @param event  The ECharts axis-pointer event payload.
     * @returns The hovered category index, or null when none is resolvable.
     */
    private resolveHoverIndex(event: AxisPointerEvent): number | null {
        const axes = event.axesInfo ?? [];
        const xAxis = axes.find((axis) => axis.axisDim === 'x') ?? axes[0];
        const value = xAxis?.value;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const index = [ORIGIN_LABEL, ...this.points().map((point) => point.title)].indexOf(value);
            return index >= 0 ? index : null;
        }
        return null;
    }

    /**
     * Builds the hover connector for the hovered level: a full red segment from the actual
     * score up to the max ceiling carrying the cumulative lag, with a thicker yellow segment
     * overlaid on the portion lost on this level, denoted in amber with a ▼ symbol. Labels
     * are horizontal, borderless, and offset clear of the line. Returns undefined when
     * nothing is hovered, the level is incomplete, or there is no lag.
     *
     * @param points      The per-level points backing the chart.
     * @param categories  The x-axis category labels, including the origin.
     * @returns The mark-line option, or undefined when no connector should draw.
     */
    private buildGapMarkLine(
        points: readonly LevelPoint[],
        categories: readonly string[],
    ): LineSeriesOption['markLine'] | undefined {
        const hovered = this.hoveredIndex();
        if (hovered === null || hovered < 1) return undefined;
        const point = points[hovered - 1];
        const category = categories[hovered];
        if (!point || category === undefined) return undefined;
        if (point.actualCumulative === null || point.gap === null || point.gap <= 0) return undefined;

        const actual = point.actualCumulative;
        const newLoss = point.gainedThisLevel === null ? 0 : point.maxScore - point.gainedThisLevel;
        const totalLabel = {
            show: true,
            position: 'end' as const,
            formatter: `-${point.gap}`,
            color: PALETTE.red.color,
            fontWeight: 'bold' as const,
            rotate: 0,
            offset: [10, 0],
            backgroundColor: 'transparent',
        };
        const lossLabel = {
            show: true,
            position: 'middle' as const,
            formatter: `▼${newLoss}`,
            color: PALETTE.orange.color,
            fontWeight: 'bold' as const,
            rotate: 0,
            offset: [10, 0],
            backgroundColor: 'transparent',
        };

        const data: NonNullable<NonNullable<LineSeriesOption['markLine']>['data']> = [
            [
                { coord: [category, actual] },
                { coord: [category, point.cumulativeMax], label: totalLabel },
            ],
        ];
        if (newLoss > 0) {
            data.push([
                { coord: [category, actual], lineStyle: { color: PALETTE.yellow.color, width: 4 } },
                { coord: [category, actual + newLoss], label: lossLabel },
            ]);
        }

        return {
            silent: true,
            symbol: 'none',
            lineStyle: { color: PALETTE.red.color, width: 2 },
            label: { show: false },
            data,
        };
    }

    csvFilename(): string {
        const runId = this.runId();
        return runId ? `cumulative-score-run-${runId}.csv` : 'cumulative-score.csv';
    }

    csvColumns(): ReadonlyArray<CsvColumn<CumulativeScoreCsvRow>> {
        return [
            { header: 'Trainee', value: (row) => row.traineeName },
            { header: 'Handle', value: (row) => row.handle },
            { header: 'Level', value: (row) => row.level },
            { header: 'Title', value: (row) => row.title },
            { header: 'Type', value: (row) => row.type },
            { header: 'Level max', value: (row) => row.levelMax },
            { header: 'Cumulative max', value: (row) => row.cumulativeMax },
            { header: 'Gained this level', value: (row) => row.gainedThisLevel },
            { header: 'Actual cumulative', value: (row) => row.actualCumulative },
            { header: 'Gap', value: (row) => row.gap },
        ];
    }

    async csvRows(): Promise<ReadonlyArray<CumulativeScoreCsvRow>> {
        const points = this.points();
        if (points.length === 0) return [];
        const userId = this.source.vm()?.userId ?? null;
        const user =
            userId === null
                ? undefined
                : (await lastValueFrom(this.entityResolver.resolveMap(EntityType.User, [userId]))).get(
                      userId,
                  );
        const traineeName = user?.name ?? user?.login ?? (userId === null ? '' : String(userId));
        const handle = user?.login ?? '';
        return points.map(
            (point, index): CumulativeScoreCsvRow => ({
                traineeName,
                handle,
                level: index + 1,
                title: point.title,
                type: point.typeLabel,
                levelMax: point.maxScore,
                cumulativeMax: point.cumulativeMax,
                gainedThisLevel: point.gainedThisLevel ?? '',
                actualCumulative: point.actualCumulative ?? '',
                gap: point.gap ?? '',
            }),
        );
    }

    /**
     * Renders the axis tooltip for the hovered level, listing the actual cumulative
     * score, the global max ceiling, the gap, and the points gained on the level.
     *
     * @param params  ECharts tooltip params for the hovered category.
     * @param points  The per-level points backing the chart.
     * @returns Tooltip HTML, empty for an out-of-range index.
     */
    private tooltipModel(
        params: TooltipEntry | TooltipEntry[],
        points: readonly LevelPoint[],
    ): RichTooltipModel | null {
        const items = Array.isArray(params) ? params : [params];
        const index = items[0]?.dataIndex ?? 0;
        if (index === 0) {
            return { title: ORIGIN_LABEL, rows: [{ label: 'Score', value: '0' }] };
        }
        const point = points[index - 1];
        if (!point) return null;
        const rows: RichTooltipRow[] = [{ label: 'Type', value: point.typeLabel }];
        if (point.actualCumulative === null) {
            rows.push(
                { label: 'Max possible', value: String(point.cumulativeMax) },
                { label: 'Status', value: 'Not completed yet' },
            );
        } else {
            rows.push(
                { label: 'Actual score', value: String(point.actualCumulative) },
                { label: 'Max possible', value: String(point.cumulativeMax) },
                { label: 'Gap', value: String(point.gap) },
                { label: 'Gained here', value: `${point.gainedThisLevel} of ${point.maxScore}` },
            );
        }
        return { title: point.title, rows };
    }
}
