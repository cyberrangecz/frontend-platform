import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { catchError, of } from 'rxjs';

import { EntityResolverService } from '@crczp/event-query-engine';

import {
    ChartPalette,
    ChartPanelInputs,
    ChartPanelShellComponent,
    ChartSourceStatus,
    CsvColumn,
    CsvExportable,
    ECHARTS_CORE_PROVIDER,
    EchartsChartBase,
    QuerySource,
    renderRichTooltipHtml,
    richTooltipDefaults,
} from '../shared';
import {
    createLevelDifficultySource,
    DifficultyAggregateRow,
    EMPTY_DIFFICULTY_DATA,
    resolveTrainingLevels,
} from './level-difficulty-source';
import {
    computeLevelDifficulty,
    LevelDifficultyPanel,
    LevelDifficultyVm,
    TIME_RATIO_CAP,
} from './level-difficulty.compute';

/** One row of the per-level CSV export. */
export interface LevelDifficultyCsvRow {
    readonly level: number;
    readonly levelName: string;
    readonly startedTrainees: number;
    readonly wrongCount: number;
    readonly hintCount: number;
    readonly solutionCount: number;
    readonly timePercent: number | null;
    readonly difficultyScore: number | null;
}

/** Pairing of a level panel with its prebuilt radar option, consumed by the template. */
interface RadarPanel {
    readonly panel: LevelDifficultyPanel;
    readonly option: EChartsOption;
}

/** Explanatory copy shown in the panel shell's info affordance. */
const DIFFICULTY_INFO =
    "One radar per training level on a shared scale: counts of wrong answers, hints and solution reveals, plus the median time spent versus the authored estimate. The number (green→red) is how much of the radar's area the level fills (0–100). The scale is based on total sum across levels, and as such, this is a relative measure of difficulty.";

/**
 * Projects a level's time ratio to a rounded percentage of the authored estimate.
 *
 * @param timeRatio Median time spent divided by the authored estimate, or null when unmeasured.
 * @returns The rounded percentage, or null when unmeasured.
 */
function timeRatioToPercent(timeRatio: number | null): number | null {
    return timeRatio === null ? null : Math.round(timeRatio * 100);
}

@Component({
    selector: 'crczp-level-difficulty',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgxEchartsDirective, ChartPanelShellComponent, MatTooltipModule],
    providers: [ECHARTS_CORE_PROVIDER],
    templateUrl: './level-difficulty.component.html',
    styleUrl: './level-difficulty.component.scss',
})
export class LevelDifficultyComponent
    extends EchartsChartBase
    implements ChartPanelInputs, CsvExportable<LevelDifficultyCsvRow>
{
    /** Explanatory copy shown in the panel shell's info affordance. */
    protected readonly difficultyInfo = DIFFICULTY_INFO;

    /** Training instance whose per-level difficulty fingerprints this chart visualises. */
    readonly instanceId = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);

    /** Resolved training-type levels (title + authored estimate); null while resolving or on error. */
    private readonly levels = toSignal(
        resolveTrainingLevels(this.instanceId, this.entityResolver).pipe(catchError(() => of(null))),
        { initialValue: null },
    );

    /** One-shot source carrying the raw event aggregates for the instance. */
    private readonly source: QuerySource<DifficultyAggregateRow> = createLevelDifficultySource(this.instanceId);

    /** Per-level difficulty view-model; null only while the levels are still resolving. */
    protected readonly vm = computed<LevelDifficultyVm | null>(() => {
        const meta = this.levels();
        if (meta === null) return null;
        const data = this.source.vm() ?? EMPTY_DIFFICULTY_DATA;
        return computeLevelDifficulty(meta, data);
    });

    /**
     * Worst-case status across level resolution and the event source. A mid-refresh
     * source status is forwarded as `refreshing` rather than collapsed to `ready`.
     */
    protected readonly status = computed<ChartSourceStatus>(() => {
        const sourceStatus = this.source.status();
        switch (sourceStatus) {
            case 'error':
                return 'error';
            case 'idle':
            case 'loading':
                return 'loading';
            case 'refreshing':
            case 'ready':
            case 'empty': {
                if (this.levels() === null) return 'loading';
                const panels = this.vm()?.panels ?? [];
                if (panels.length === 0) return 'empty';
                return sourceStatus === 'refreshing' ? 'refreshing' : 'ready';
            }
            default: {
                const exhaustive: never = sourceStatus;
                return exhaustive;
            }
        }
    });

    /** One radar option per training level, rebuilt when the view-model or palette changes. */
    protected readonly panelOptions = computed<readonly RadarPanel[]>(() => {
        const viewModel = this.vm();
        if (!viewModel) return [];
        const palette = this.palette();
        return viewModel.panels.map((panel: LevelDifficultyPanel) => ({
            panel,
            option: this.buildRadarOption(panel, viewModel, palette),
        }));
    });

    /**
     * Builds the ECharts radar option for a single level panel. The three count axes plot raw
     * counts against a maximum shared across all levels (so the small-multiples are comparable),
     * the time axis spans 0–200%, and a native item tooltip lists each count against the
     * across-levels total. An unmeasured time axis renders as a '-' gap on the radar and as
     * 'n/a' in the tooltip.
     *
     * @param panel   The level's computed difficulty fingerprint.
     * @param vm      The full view-model, for the cross-level axis maxima and totals.
     * @param palette Resolved theme colours for canvas rendering.
     * @returns       The radar chart option for this panel.
     */
    private buildRadarOption(panel: LevelDifficultyPanel, vm: LevelDifficultyVm, palette: ChartPalette): EChartsOption {
        const timePercent = timeRatioToPercent(panel.timeRatio);
        const values: (number | string)[] = [panel.wrongCount, panel.hintCount, panel.solutionCount, timePercent ?? '-'];
        const sharePercent = (count: number, total: number): number =>
            total > 0 ? Math.round((count / total) * 100) : 0;
        return {
            tooltip: {
                ...richTooltipDefaults(palette),
                trigger: 'item',
                formatter: () => {
                    const countOfTotal = (value: number, total: number): string =>
                        `${value}/${total} (${sharePercent(value, total)}%)`;
                    const timeBody =
                        timePercent === null ? 'n/a' : `${timePercent}% (median of ${panel.timeSampleCount})`;
                    return renderRichTooltipHtml({
                        title: panel.title,
                        rows: [
                            { label: 'Wrong answers', value: countOfTotal(panel.wrongCount, vm.totals.wrong) },
                            { label: 'Hints', value: countOfTotal(panel.hintCount, vm.totals.hint) },
                            { label: 'Solution', value: countOfTotal(panel.solutionCount, vm.totals.solution) },
                            { label: 'Time vs estimate', value: timeBody },
                        ],
                    });
                },
            },
            radar: {
                indicator: [
                    { name: 'Wrong', max: Math.max(vm.axisMax.wrong, 1) },
                    { name: 'Hints', max: Math.max(vm.axisMax.hint, 1) },
                    { name: 'Solution', max: Math.max(vm.axisMax.solution, 1) },
                    { name: 'Time', max: TIME_RATIO_CAP * 100 },
                ],
                center: ['50%', '54%'],
                radius: '64%',
                splitNumber: 4,
                axisName: { color: palette.mutedText, fontSize: 11 },
                axisLine: { lineStyle: { color: palette.gridLine } },
                splitLine: { lineStyle: { color: palette.gridLine } },
                splitArea: { show: false },
            },
            series: [
                {
                    type: 'radar',
                    data: [
                        {
                            name: panel.title,
                            value: values,
                            areaStyle: { color: palette.accent, opacity: 0.3 },
                            lineStyle: { color: palette.accent, width: 2 },
                            itemStyle: { color: palette.accent },
                        },
                    ],
                },
            ],
        };
    }

    /** @returns File name (without extension) for the downloaded CSV. */
    csvFilename(): string {
        return `level-difficulty-${this.instanceId()}`;
    }

    /**
     * @returns Column definitions for the CSV export, in output order: one row per training
     *          level with its 1-based number, title, started-trainee count, the three raw event
     *          counts, the median time ratio as a percentage, and the composite difficulty.
     */
    csvColumns(): ReadonlyArray<CsvColumn<LevelDifficultyCsvRow>> {
        return [
            { header: 'Level', value: (row) => row.level },
            { header: 'Level name', value: (row) => row.levelName },
            { header: 'Started trainees', value: (row) => row.startedTrainees },
            { header: 'Wrong answers', value: (row) => row.wrongCount },
            { header: 'Hints', value: (row) => row.hintCount },
            { header: 'Solution', value: (row) => row.solutionCount },
            { header: 'Time vs estimate %', value: (row) => row.timePercent },
            { header: 'Difficulty', value: (row) => row.difficultyScore },
        ];
    }

    /**
     * @returns One CSV row per training level, projected from the current view-model. Event
     *          measures are raw counts; the time and difficulty columns are null for levels
     *          with no measurable data.
     */
    csvRows(): ReadonlyArray<LevelDifficultyCsvRow> {
        const panels = this.vm()?.panels ?? [];
        return panels.map((panel: LevelDifficultyPanel) => ({
            level: panel.order + 1,
            levelName: panel.title,
            startedTrainees: panel.startedCount,
            wrongCount: panel.wrongCount,
            hintCount: panel.hintCount,
            solutionCount: panel.solutionCount,
            timePercent: timeRatioToPercent(panel.timeRatio),
            difficultyScore: panel.difficultyScore,
        }));
    }
}
