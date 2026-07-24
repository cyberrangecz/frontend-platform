import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    Signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, switchMap } from 'rxjs';
import { EChartsOption, ScatterSeriesOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';

import { EntityResolverService } from '@crczp/event-query-engine';

import {
    cappedRunDurationMs,
    ChartPanelInputs,
    ChartPanelShellComponent,
    ChartSourceStatus,
    ECHARTS_CORE_PROVIDER,
    EchartsChartBase,
    formatClock,
    loadCircularAvatarImageUrl,
    PALETTE,
    renderRichTooltipHtml,
    resolveInstanceLevels,
    richTooltipDefaults,
    RichTooltipRow,
} from '../shared';
import { createTraineeOverviewSource, TraineeRawRow } from '../trainee-overview/trainee-overview-source';

/** Rendered diameter in pixels of the highlighted run's avatar marker. */
const AVATAR_DIAMETER = 20;
/** Symbol size in pixels of a peer run's dot. */
const PEER_SYMBOL_SIZE = 9;
/** Symbol size in pixels of the highlighted run's dot when it has no avatar. */
const YOU_DOT_SIZE = 18;
/** Font size in pixels of the four quadrant corner labels. */
const CORNER_LABEL_FONT_SIZE = 11;
/** X-axis maximum applied when no run carries a positive duration, in milliseconds. */
const FALLBACK_TIME_MAX_MS = 60_000;
/** Fraction of headroom added above the largest duration so the rightmost point clears the axis. */
const TIME_HEADROOM = 1.08;

/** One finished run positioned in the speed-versus-score field. */
interface ScatterPoint {
    /** Training run identifier. */
    readonly runId: number;
    /** Trainee display name carried by the source (already backend-anonymized). */
    readonly name: string;
    /** Raw base64 avatar picture, empty when the trainee has none. */
    readonly picture: string;
    /** Total run duration in milliseconds. */
    readonly timeMs: number;
    /** Final score as a percentage of the reachable maximum, clamped to 0–100. */
    readonly scorePercent: number;
    /** Whether this is the run the dashboard gives feedback on. */
    readonly isCurrent: boolean;
}

/** Population averages plotted as the quadrant crosshair. */
interface Averages {
    /** Mean run duration across the plotted runs, in milliseconds. */
    readonly timeMs: number;
    /** Mean score percentage across the plotted runs. */
    readonly scorePercent: number;
}

/** Structural shape of the entry ECharts passes to the item-trigger tooltip formatter. */
interface ScatterTooltipParam {
    readonly seriesName?: string;
    readonly name?: string;
    readonly value?: unknown;
}

/**
 * Arithmetic mean of the values, or zero for an empty list.
 *
 * @param values The values to average.
 * @returns The mean, or 0 when there are no values.
 */
function mean(values: readonly number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Overall speed-versus-score scatter quadrant: every finished run of the instance placed by
 * total time against final score percentage, the current run highlighted, and the field split
 * into fast/slow × high/low quadrants by the population averages. Reads the whole run against
 * the cohort — the global counterpart to the per-level standing charts.
 */
@Component({
    selector: 'crczp-overall-speed-vs-score',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './overall-speed-vs-score.component.html',
    styleUrl: './overall-speed-vs-score.component.scss',
})
export class OverallSpeedVsScoreComponent extends EchartsChartBase implements ChartPanelInputs {
    readonly instanceId: InputSignal<number> = input.required<number>();
    readonly runId: InputSignal<number | null> = input<number | null>(null);

    private readonly entityResolver = inject(EntityResolverService);

    private readonly source = createTraineeOverviewSource(this.instanceId, this.entityResolver);

    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /** Reachable maximum score for the instance; zero when no scored level resolves. */
    private readonly maxReachableScore: Signal<number> = computed(() => {
        const resolved = this.resolvedLevels();
        if (!resolved) return 0;
        return resolved.levels.reduce((sum, level) => sum + (level.maxScore > 0 ? level.maxScore : 0), 0);
    });

    /** Every finished run of the instance as a plottable point; empty until data and levels land. */
    private readonly points: Signal<readonly ScatterPoint[]> = computed(() => {
        const rows = this.source.vm();
        const maxReachable = this.maxReachableScore();
        if (!rows || maxReachable <= 0) return [];
        const currentRunId = this.runId();
        const instanceEndMs = this.resolvedLevels()?.instance.endTime.getTime() ?? null;
        return rows
            .filter(
                (row): row is TraineeRawRow & { endStartTime: number; endEndTime: number } =>
                    row.hasEndedRow && row.endStartTime !== null && row.endEndTime !== null,
            )
            .map((row): ScatterPoint => {
                const timeMs = cappedRunDurationMs(row.endStartTime, row.endEndTime, instanceEndMs);
                const rawPercent = ((row.trainingScore + row.assessmentScore) / maxReachable) * 100;
                return {
                    runId: row.runId,
                    name: row.traineeName,
                    picture: row.traineePicture,
                    timeMs,
                    scorePercent: Math.min(100, Math.max(0, rawPercent)),
                    isCurrent: row.runId === currentRunId,
                };
            });
    });

    /** The highlighted run's point, or null when it is not among the finished runs. */
    private readonly currentPoint: Signal<ScatterPoint | null> = computed(
        () => this.points().find((point) => point.isCurrent) ?? null,
    );

    /** Population averages for the crosshair, or null when nothing is plotted. */
    private readonly averages: Signal<Averages | null> = computed(() => {
        const points = this.points();
        if (points.length === 0) return null;
        return {
            timeMs: mean(points.map((point) => point.timeMs)),
            scorePercent: mean(points.map((point) => point.scorePercent)),
        };
    });

    /** X-axis maximum: the longest run plus headroom, or a fallback when no run has duration. */
    private readonly timeMax: Signal<number> = computed(() => {
        const maxMs = Math.max(0, ...this.points().map((point) => point.timeMs));
        return maxMs > 0 ? Math.ceil(maxMs * TIME_HEADROOM) : FALLBACK_TIME_MAX_MS;
    });

    /** Circular avatar image URL for the highlighted run, or null when it has no picture. */
    private readonly avatarImageUrl: Signal<string | null> = toSignal(
        toObservable(this.currentPoint).pipe(
            map((point) => point?.picture ?? ''),
            distinctUntilChanged(),
            switchMap((picture) => loadCircularAvatarImageUrl(picture, AVATAR_DIAMETER)),
        ),
        { initialValue: null },
    );

    protected readonly status: Signal<ChartSourceStatus> = computed(() => {
        if (this.resolvedLevels() === null) return 'loading';
        const sourceStatus = this.source.status();
        if (sourceStatus === 'error') return 'error';
        if (sourceStatus === 'idle' || sourceStatus === 'loading') return 'loading';
        return this.points().length === 0 ? 'empty' : 'ready';
    });

    protected readonly chartOptions = computed<EChartsOption>(() => {
        const palette = this.palette();
        const { accent, mutedText, gridLine, surface } = palette;
        const points = this.points();
        const timeMax = this.timeMax();
        const current = this.currentPoint();
        const averages = this.averages();
        const avatarUrl = this.avatarImageUrl();

        const quadrant = this.quadrantSeries(timeMax, mutedText);
        if (averages) {
            quadrant.markLine = {
                silent: true,
                symbol: 'none',
                animation: false,
                lineStyle: { color: mutedText, type: 'dashed', width: 1 },
                label: { show: true, formatter: '{b}', color: mutedText, fontSize: 10 },
                data: [
                    { name: 'average time', xAxis: averages.timeMs },
                    { name: 'average score', yAxis: averages.scorePercent },
                ],
            };
        }

        const series: ScatterSeriesOption[] = [
            quadrant,
            {
                type: 'scatter',
                name: 'peer',
                z: 2,
                symbol: 'circle',
                symbolSize: PEER_SYMBOL_SIZE,
                itemStyle: { color: PALETTE.gray.color, opacity: 0.75, borderColor: surface, borderWidth: 1 },
                data: points
                    .filter((point) => !point.isCurrent)
                    .map((point) => ({ value: [point.timeMs, point.scorePercent], name: point.name })),
            },
        ];

        if (current) {
            series.push(...this.currentRunSeries(current, avatarUrl, accent, surface));
        }

        return {
            animation: false,
            grid: { top: 24, right: 26, bottom: 46, left: 18, containLabel: true },
            tooltip: {
                ...richTooltipDefaults(palette),
                trigger: 'item',
                formatter: (params: unknown) => {
                    const list = Array.isArray(params) ? params : [params];
                    const item = list[0] as ScatterTooltipParam | undefined;
                    if (!item || !Array.isArray(item.value)) return '';
                    const [timeMs, scorePercent] = item.value as [number, number];
                    const rows: RichTooltipRow[] = [
                        { label: 'Time', value: formatClock(timeMs) },
                        { label: 'Score', value: `${Math.round(scorePercent)}%` },
                    ];
                    const name = item.name ?? '';
                    const title = item.seriesName === 'you' ? `${name} · you` : name;
                    return renderRichTooltipHtml({ title, rows });
                },
            },
            xAxis: {
                type: 'value',
                name: 'time',
                nameLocation: 'middle',
                nameGap: 28,
                nameTextStyle: { color: mutedText },
                min: 0,
                max: timeMax,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: gridLine } },
                axisLabel: { color: mutedText, formatter: (value: number) => formatClock(value) },
            },
            yAxis: {
                type: 'value',
                name: 'score %',
                nameLocation: 'middle',
                nameGap: 38,
                nameRotate: 90,
                nameTextStyle: { color: mutedText },
                min: 0,
                max: 100,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: gridLine } },
                axisLabel: { color: mutedText, formatter: '{value}%' },
            },
            series,
        };
    });

    /**
     * Builds the silent, symbol-less series carrying the four quadrant corner labels, anchored
     * to the axis extremes so they track the plot area across resizes.
     *
     * @param timeMax   Current x-axis maximum, the right-edge anchor for the right labels.
     * @param mutedText Muted label color from the palette.
     * @returns A scatter series whose only visible output is the four corner labels.
     */
    private quadrantSeries(timeMax: number, mutedText: string): ScatterSeriesOption {
        const corner = (
            x: number,
            y: number,
            text: string,
            align: 'left' | 'right',
            verticalAlign: 'top' | 'bottom',
            offset: [number, number],
        ): NonNullable<ScatterSeriesOption['data']>[number] => ({
            value: [x, y],
            label: { show: true, formatter: text, color: mutedText, fontSize: CORNER_LABEL_FONT_SIZE, align, verticalAlign, offset },
        });
        return {
            type: 'scatter',
            name: 'quadrant',
            silent: true,
            symbolSize: 0,
            animation: false,
            z: 1,
            data: [
                corner(0, 100, 'fast & high', 'left', 'top', [6, 4]),
                corner(timeMax, 100, 'slow & high', 'right', 'top', [-6, 4]),
                corner(0, 0, 'fast & low', 'left', 'bottom', [6, -4]),
                corner(timeMax, 0, 'slow & low', 'right', 'bottom', [-6, -4]),
            ],
        };
    }

    /**
     * Builds the highlighted run's series. With an avatar, an accent ring circle sits behind the
     * circular avatar image symbol; without one, a single accent dot tagged with a persistent
     * "you" label. All returned series share the run's point so they stack at the same position.
     *
     * @param current   The highlighted run's point.
     * @param avatarUrl The circular avatar image URL, or null when unavailable.
     * @param accent    Accent color from the palette.
     * @param surface   Surface color from the palette, used as the fallback dot's ring.
     * @returns The scatter series for the current run, stacked back-to-front.
     */
    private currentRunSeries(
        current: ScatterPoint,
        avatarUrl: string | null,
        accent: string,
        surface: string,
    ): ScatterSeriesOption[] {
        const point = [{ value: [current.timeMs, current.scorePercent], name: current.name }];
        if (avatarUrl) {
            return [
                {
                    type: 'scatter',
                    name: 'you-ring',
                    silent: true,
                    z: 4,
                    symbol: 'circle',
                    symbolSize: AVATAR_DIAMETER + 2,
                    itemStyle: { color: 'transparent', borderColor: accent, borderWidth: 2 },
                    data: point,
                },
                {
                    type: 'scatter',
                    name: 'you',
                    z: 5,
                    symbol: `image://${avatarUrl}`,
                    symbolSize: AVATAR_DIAMETER,
                    data: point,
                },
            ];
        }
        return [
            {
                type: 'scatter',
                name: 'you',
                z: 5,
                symbol: 'circle',
                symbolSize: YOU_DOT_SIZE,
                itemStyle: { color: accent, borderColor: surface, borderWidth: 2 },
                label: { show: true, formatter: 'you', position: 'top', color: accent, fontSize: 11, fontWeight: 600 },
                data: point,
            },
        ];
    }
}
