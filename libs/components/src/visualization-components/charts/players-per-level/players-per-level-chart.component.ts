import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { formatDistanceToNowStrict } from 'date-fns';
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
    QuerySource,
    renderRichTooltipHtml,
    richTooltipDefaults,
    TooltipEntry,
} from '../shared';
import {
    ActiveRunLevel,
    buildLevelAxisStream,
    buildPlayersPerLevelRows,
    createPlayersPerLevelLiveSource,
    tallyByLevelOrder,
    PlayersPerLevelVm,
} from './players-per-level-source';

/**
 * One row of the per-trainee CSV export.
 * Each active run contributes exactly one row.
 */
export interface PlayersPerLevelCsvRow {
    readonly traineeId: number;
    readonly trainee: string;
    readonly email: string;
    readonly sandboxId: string;
    readonly currentLevel: number;
    readonly levelName: string;
    readonly timeOnCurrentLevel: string;
}

@Component({
    selector: 'crczp-players-per-level-chart',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './players-per-level-chart.component.html',
    styleUrl: './players-per-level-chart.component.scss',
})
export class PlayersPerLevelChartComponent
    extends EchartsChartBase
    implements ChartPanelInputs, CsvExportable<PlayersPerLevelCsvRow>
{
    /** Training instance whose active level-player distribution this chart visualises. */
    readonly instanceId: InputSignal<number> = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);

    private readonly axis = toSignal(
        buildLevelAxisStream(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /** Live source emitting one ActiveRunLevel per active run (finished runs excluded). */
    private readonly live: QuerySource<readonly ActiveRunLevel[]> =
        createPlayersPerLevelLiveSource(this.instanceId);

    /** Combined view-model joining the axis labels with live active player counts. */
    protected readonly vm = computed<PlayersPerLevelVm | null>(() => {
        const axis = this.axis();
        if (axis === null) return null;
        const activeRuns = this.live.vm() ?? [];
        const rows = buildPlayersPerLevelRows(axis, tallyByLevelOrder(activeRuns));
        const totalPlayers = activeRuns.length;
        return { rows, totalPlayers };
    });

    /** Reflects the worst-case status across both async sources. */
    protected readonly status = computed<ChartSourceStatus>(() => {
        const merged = mergeSourceStatuses(
            this.live.status(),
            this.axis() === null ? 'loading' : 'ready',
        );
        if (merged !== 'ready' && merged !== 'refreshing') return merged;
        if ((this.vm()?.totalPlayers ?? 0) === 0) return 'empty';
        return merged;
    });

    /**
     * Pins the hover cursor to the default arrow,
     * since none of this chart's marks are clickable.
     *
     * @param instance The ECharts instance being wired.
     */
    protected override wireChart(instance: ECharts): void {
        super.wireChart(instance);
        this.pinDefaultCursor(instance);
    }

    /**
     * ECharts option object derived from the current view-model and the resolved
     * theme accent color. Rebuilt reactively whenever either changes.
     */
    protected readonly chartOptions = computed<EChartsOption>(() => {
        const viewModel = this.vm();
        const rows = viewModel?.rows ?? [];
        const palette = this.palette();
        const { accent, mutedText, surface } = palette;
        const labelWidth = categoryLabelWidth(this.chartWidth(), rows.length);

        return {
            animationDuration: 700,
            animationDurationUpdate: 700,
            animationEasing: 'cubicOut',
            animationEasingUpdate: 'cubicOut',
            grid: {
                top: 40,
                right: 48,
                bottom: 8,
                left: 48,
                containLabel: true,
            },
            tooltip: {
                ...richTooltipDefaults(palette),
                formatter: (params: TooltipEntry | TooltipEntry[]) => {
                    const items = Array.isArray(params) ? params : [params];
                    const [item] = items;
                    if (!item) return '';
                    const order = (item.dataIndex ?? 0) + 1;
                    return renderRichTooltipHtml({
                        title: `${order}. ${String(item.name)}`,
                        rows: [{ label: 'Active players', value: String(item.value) }],
                    });
                },
            },
            xAxis: {
                ...baseCategoryAxisDefaults(palette),
                data: rows.map((row) => row.levelLabel),
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
                name: 'Active players',
                nameGap: 18,
                nameTextStyle: { color: mutedText, align: 'left' },
                minInterval: 1,
                splitNumber: 8,
            },
            series: [
                {
                    type: 'line',
                    name: 'Active players',
                    data: rows.map((row) => row.playerCount),
                    smooth: 0.4,
                    symbol: 'circle',
                    symbolSize: 9,
                    showSymbol: true,
                    lineStyle: {
                        width: 3,
                        color: accent,
                        shadowBlur: 12,
                        shadowColor: `${accent}33`,
                        shadowOffsetY: 6,
                    },
                    areaStyle: { color: accent, opacity: 0.12 },
                    itemStyle: { color: accent, borderColor: surface, borderWidth: 2 },
                    emphasis: { scale: true },
                },
            ],
        };
    });

    /**
     * Returns the current x-axis category labels so the inherited hover handler
     * can map a hovered label value back to its series data index.
     *
     * @returns Ordered level label strings matching the x-axis `data` array.
     */
    protected override axisLabels(): readonly string[] {
        return this.vm()?.rows.map((row) => row.levelLabel) ?? [];
    }

    /** @returns File name (without extension) for the downloaded CSV. */
    csvFilename(): string {
        return 'players-per-level';
    }

    /**
     * @returns Column definitions for the CSV export, in output order.
     *          One row per active trainee: their id, name, email, sandbox id, current
     *          level number (1-based), level name, and time spent on the current level.
     */
    csvColumns(): ReadonlyArray<CsvColumn<PlayersPerLevelCsvRow>> {
        return [
            { header: 'Trainee ID', value: (row) => row.traineeId },
            { header: 'Trainee', value: (row) => row.trainee },
            { header: 'Email', value: (row) => row.email },
            { header: 'Sandbox ID', value: (row) => row.sandboxId },
            { header: 'Current level', value: (row) => row.currentLevel },
            { header: 'Level name', value: (row) => row.levelName },
            { header: 'Time on current level', value: (row) => row.timeOnCurrentLevel },
        ];
    }

    /**
     * Resolves trainee display names on demand and returns one CSV row per active run.
     * Resolution is deferred to export time so no entity fetches run during polling.
     * Trainee name falls back from display name to login to numeric id string.
     * Duration is the human-readable time since the trainee entered the current level.
     *
     * @returns Promise resolving to one {@link PlayersPerLevelCsvRow} per active trainee.
     */
    async csvRows(): Promise<ReadonlyArray<PlayersPerLevelCsvRow>> {
        const activeRuns = this.live.vm() ?? [];
        if (activeRuns.length === 0) return [];
        const ids = [...new Set(activeRuns.map((run) => run.userRefId))];
        const nameById = await lastValueFrom(this.entityResolver.resolveMap(EntityType.User, ids));
        return activeRuns.map((run): PlayersPerLevelCsvRow => {
            const user = nameById.get(run.userRefId);
            const trainee = user?.name ?? user?.login ?? String(run.userRefId);
            return {
                traineeId: run.userRefId,
                trainee,
                email: user?.mail ?? '',
                sandboxId: run.sandboxId,
                currentLevel: run.currentLevelOrder + 1,
                levelName: run.currentLevelTitle,
                timeOnCurrentLevel: formatDistanceToNowStrict(new Date(run.levelStartedAt)),
            };
        });
    }
}
