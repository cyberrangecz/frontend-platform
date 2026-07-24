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
import { Sort, MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { EntityResolverService } from '@crczp/event-query-engine';
import { NotificationService, SortDir } from '@crczp/utils';
import { formatDuration as dateFnsFormatDuration, intervalToDuration } from 'date-fns';
import {
    ChartPanelInputs,
    ChartPanelShellComponent,
    CsvColumn,
    CsvExportable,
    DASHBOARD_CONFIG,
    buildRankedComparator,
    byNumber,
    byText,
    chainComparators,
    ColumnComparators,
    createInstanceClock,
    runDurationMs,
    reversed,
    QuerySource,
    resolveInstanceLevels,
    RichTooltipDirective,
    RichTooltipModel,
    RunState,
    RunStateChipComponent,
    TraineeIdentityComponent,
} from '../shared';
import {
    createScoreboardSource,
    ScoreboardRawRow,
    ScoreboardRow,
    ScoreboardVm,
} from './scoreboard-source';

/** The five rendered column identifiers for the Material table. */
const DISPLAYED_COLUMNS: readonly string[] = ['rank', 'trainee', 'score', 'time', 'state'];

/** One row of the per-trainee CSV export. */
export interface ScoreboardCsvRow {
    readonly rank: number;
    readonly traineeName: string;
    readonly traineeLogin: string;
    readonly traineeEmail: string;
    readonly state: string;
    readonly totalScore: number;
    readonly assessmentScore: number;
    readonly maxScore: number;
    readonly percent: number;
    readonly totalTime: string;
}

/**
 * Intermediate per-run shape before rank assignment and display-text derivation.
 * Omits fields that are computed in the final ranked pass so TypeScript excess-property
 * checking prevents accidental placeholder values from slipping through.
 */
type UnrankedRow = Omit<ScoreboardRow, 'rank' | 'durationText' | 'scoreText' | 'stateLabel' | 'percent' | 'tooltip'>;

@Component({
    selector: 'crczp-scoreboard-table',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ChartPanelShellComponent,
        MatTableModule,
        MatSortModule,
        RichTooltipDirective,
        RunStateChipComponent,
        TraineeIdentityComponent,
    ],
    templateUrl: './scoreboard-table.component.html',
    styleUrl: './scoreboard-table.component.scss',
})
export class ScoreboardTableComponent implements ChartPanelInputs, CsvExportable<ScoreboardCsvRow> {
    /** Training instance whose trainee rankings this table visualises. */
    readonly instanceId: InputSignal<number> = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);
    private readonly notificationService = inject(NotificationService);

    /**
     * Resolved instance and its level list — single resolution point for both
     * the max score denominator and the instance end-time used to stop the clock.
     */
    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /**
     * Sum of maximum attainable scores across all definition levels.
     * Zero while levels have not yet resolved.
     */
    private readonly maxScore: Signal<number> = computed(() => {
        const resolved = this.resolvedLevels();
        if (!resolved || resolved.levels.length === 0) return 0;
        let sum = 0;
        for (const level of resolved.levels) {
            sum += level.maxScore;
        }
        return sum;
    });

    /** Wall clock driving running-run elapsed time; stops once the instance closes. */
    private readonly now: Signal<number> = createInstanceClock(
        DASHBOARD_CONFIG.clockTickMs,
        () => this.resolvedLevels()?.instance.endTime,
    );

    private readonly liveSource: QuerySource<readonly ScoreboardRawRow[]> = createScoreboardSource(
        this.instanceId,
        this.entityResolver,
    );

    /**
     * Active column sort state. The direction defaults to 'desc' for the
     * initial score sort and is never cleared (matSortDisableClear).
     */
    protected readonly sortState = signal<{ active: string; direction: SortDir }>({
        active: 'score',
        direction: 'desc',
    });

    /**
     * Combined view-model joining live raw rows (already containing resolved trainee
     * names) with the reactive clock and max score. State classification, duration,
     * rank, and display text are derived here so that changes to `now()` trigger
     * re-renders via Angular's reactive graph.
     */
    protected readonly vm = computed<ScoreboardVm | null>(() => {
        const rawRows = this.liveSource.vm();
        if (!rawRows) return null;

        const currentNow = this.now();
        const currentMaxScore = this.maxScore();
        const instanceEndMs = this.resolvedLevels()?.instance.endTime.getTime() ?? null;

        const unranked = rawRows.map((raw: ScoreboardRawRow): UnrankedRow => {
            const state: RunState = raw.hasEndedRow ? 'finished' : 'running';

            const durationMs = runDurationMs(raw, currentNow, instanceEndMs);

            const combinedScore = raw.totalTrainingScore + raw.totalAssessmentScore;

            return {
                trainingRunId: raw.trainingRunId,
                userId: raw.userId,
                traineeName: raw.traineeName,
                traineeLogin: raw.traineeLogin,
                traineeEmail: raw.traineeEmail,
                traineePicture: raw.traineePicture,
                totalTrainingScore: raw.totalTrainingScore,
                totalAssessmentScore: raw.totalAssessmentScore,
                combinedScore,
                durationMs,
                state,
            };
        });

        unranked.sort(chainComparators<UnrankedRow>(
            reversed(byNumber((row) => row.combinedScore)),
            byNumber((row) => row.durationMs),
        ));

        const rows: readonly ScoreboardRow[] = unranked.map((row, index) => {
            const stateLabel = row.state === 'running' ? 'Running' : 'Finished';
            const durationText = this.formatDuration(row.durationMs);
            const scoreText = `${row.combinedScore} / ${currentMaxScore}`;
            const percent = currentMaxScore > 0 ? Math.round((row.combinedScore / currentMaxScore) * 100) : 0;
            const tooltip: RichTooltipModel = {
                title: row.traineeName,
                rows: [
                    { label: 'Status', value: stateLabel },
                    { label: 'Training score', value: String(row.totalTrainingScore) },
                    { label: 'Assessment score', value: String(row.totalAssessmentScore) },
                    { label: 'Total', value: scoreText },
                    { label: 'Score %', value: `${percent}%` },
                    { label: 'Time', value: durationText },
                ],
            };
            return {
                ...row,
                rank: index + 1,
                durationText,
                scoreText,
                stateLabel,
                percent,
                tooltip,
            };
        });

        return { rows, maxScore: currentMaxScore };
    });

    protected readonly displayedColumns = DISPLAYED_COLUMNS;

    protected readonly status = this.liveSource.status;

    /** Ascending comparator per sortable column, keyed by column identifier. */
    private readonly columnComparators: ColumnComparators<ScoreboardRow> = {
        rank: byNumber((row) => row.rank),
        trainee: byText((row) => row.traineeName),
        state: byNumber((row) => (row.state === 'running' ? 0 : 1)),
        score: byNumber((row) => row.combinedScore),
        time: byNumber((row) => row.durationMs),
    };

    /**
     * Sorted rows derived from the current view-model and the active sort state.
     */
    protected readonly sortedRows = computed<readonly ScoreboardRow[]>(() => {
        const viewModel = this.vm();
        if (!viewModel) return [];
        const comparator = buildRankedComparator(this.columnComparators, {
            ...this.sortState(),
            scoreColumn: 'score',
            durationColumn: 'time',
        });
        return [...viewModel.rows].sort(comparator);
    });

    /**
     * Track-by identity for the row `*matRowDef`, keyed by training run id.
     *
     * @param _index  Row index (unused).
     * @param row     The scoreboard row being tracked.
     */
    protected readonly trackByRunId = (_index: number, row: ScoreboardRow): number =>
        row.trainingRunId;

    /**
     * Writes the new sort state when the user interacts with a column header.
     * Empty direction is treated as descending because clear is disabled.
     *
     * @param sort  The sort event emitted by MatSort.
     */
    protected onSortChange(sort: Sort): void {
        this.sortState.set({
            active: sort.active,
            direction: sort.direction || 'desc',
        });
    }

    /**
     * Formats the given duration in milliseconds into two coarse units (e.g. `1h 42m`).
     *
     * @param durationMs  Duration in milliseconds to format.
     */
    protected formatDuration(durationMs: number): string {
        const duration = intervalToDuration({ start: 0, end: Math.max(0, Math.round(durationMs)) });
        const formatted = dateFnsFormatDuration(duration, {
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
                const num = parseInt(numericPart, 10);
                const unit = unitPart.replace(/s$/, '').charAt(0);
                abbreviated.push(`${num}${unit}`);
            }
            index += 2;
        }
        return abbreviated.join(' ');
    }

    /** @returns File name (without extension) for the downloaded CSV. */
    csvFilename(): string {
        return 'scoreboard';
    }

    /**
     * @returns Column definitions for the CSV export, in output order:
     *          rank, trainee name, login, email, state, training score, assessment score,
     *          max attainable score, percentage achieved, and total time.
     */
    csvColumns(): ReadonlyArray<CsvColumn<ScoreboardCsvRow>> {
        return [
            { header: 'Rank',             value: (row) => row.rank },
            { header: 'Trainee name',     value: (row) => row.traineeName },
            { header: 'Login',            value: (row) => row.traineeLogin },
            { header: 'Email',            value: (row) => row.traineeEmail },
            { header: 'State',            value: (row) => row.state },
            { header: 'Training score',   value: (row) => row.totalScore },
            { header: 'Assessment score', value: (row) => row.assessmentScore },
            { header: 'Max score',        value: (row) => row.maxScore },
            { header: 'Score %',          value: (row) => row.percent },
            { header: 'Total time',       value: (row) => row.totalTime },
        ];
    }

    /**
     * Returns the CSV rows derived from the current view-model snapshot.
     * Trainee identities are taken directly from the already-resolved rows in the
     * view-model — no additional entity fetch is performed at export time.
     * Emits an error notification and returns an empty array when no data is available.
     *
     * @returns Array of ScoreboardCsvRow, one per trainee.
     */
    async csvRows(): Promise<ReadonlyArray<ScoreboardCsvRow>> {
        const viewModel = this.vm();
        if (!viewModel || viewModel.rows.length === 0) {
            this.notificationService.emit('error', 'No scoreboard data to export.');
            return [];
        }
        const { rows, maxScore } = viewModel;
        return rows.map((row): ScoreboardCsvRow => ({
            rank: row.rank,
            traineeName: row.traineeName,
            traineeLogin: row.traineeLogin,
            traineeEmail: row.traineeEmail,
            state: row.stateLabel,
            totalScore: row.totalTrainingScore,
            assessmentScore: row.totalAssessmentScore,
            maxScore,
            percent: row.percent,
            totalTime: this.formatDuration(row.durationMs),
        }));
    }
}
