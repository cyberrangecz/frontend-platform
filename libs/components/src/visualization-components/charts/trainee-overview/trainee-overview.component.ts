import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    InputSignal,
    model,
    Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { format, intervalToDuration } from 'date-fns';
import { EntityResolverService } from '@crczp/event-query-engine';
import { AbstractLevelTypeEnum } from '@crczp/training-model';
import {
    ChartSourceStatus,
    createInstanceClock,
    DASHBOARD_CONFIG,
    LevelBasicView,
    runDurationMs,
    PanelPlaceholderComponent,
    QuerySource,
    RunState,
    resolveInstanceLevels,
} from '../shared';
import { LevelProgress, LevelStatus, TraineeRow } from './trainee-overview.model';
import { createTraineeOverviewSource, TraineeLevelRaw, TraineeRawRow } from './trainee-overview-source';
import { TraineeCardComponent } from './trainee-card.component';
import { TraineeTableComponent } from './trainee-table.component';

/** Wall-clock time-of-day format for run start and end labels. */
const TIME_OF_DAY_FORMAT = 'HH:mm';

/**
 * Level-type values denoting a training level across the model, event, and DTO
 * conventions present in the codebase. The cache `level_type` column may carry any
 * of these depending on the event source.
 */
const TRAINING_LEVEL_TYPES: ReadonlySet<string> = new Set([
    AbstractLevelTypeEnum.Training,
    'TRAINING',
    'TRAINING_LEVEL',
]);

/** Level-type values denoting an access level across the codebase's conventions. */
const ACCESS_LEVEL_TYPES: ReadonlySet<string> = new Set([
    AbstractLevelTypeEnum.Access,
    'ACCESS',
    'ACCESS_LEVEL',
]);

/**
 * Trainee-view foundation: a selectable live-monitor table of all trainee runs
 * beside a full-profile card for the selected trainee. Selecting a row drives the
 * card and (later) the per-trainee graphs below. Backed by the local event cache
 * through a live-polling query source; clock-driven metrics are derived here.
 */
@Component({
    selector: 'crczp-trainee-overview',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatCardModule, PanelPlaceholderComponent, TraineeTableComponent, TraineeCardComponent],
    templateUrl: './trainee-overview.component.html',
    styleUrl: './trainee-overview.component.scss',
})
export class TraineeOverviewComponent {
    /** Training instance whose trainee runs are shown. */
    readonly instanceId: InputSignal<number> = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);

    /** Resolved instance and its ordered level list — the breakdown axis and clock stop-time. */
    private readonly resolvedLevels = toSignal(
        resolveInstanceLevels(this.instanceId, this.entityResolver),
        { initialValue: null },
    );

    /** Live raw rows per run, with resolved identity and per-level event aggregates. */
    private readonly source: QuerySource<readonly TraineeRawRow[]> = createTraineeOverviewSource(
        this.instanceId,
        this.entityResolver,
    );

    /** Wall clock driving running-run elapsed and time-in-level displays; stops once the instance closes. */
    private readonly now: Signal<number> = createInstanceClock(
        DASHBOARD_CONFIG.clockTickMs,
        () => this.resolvedLevels()?.instance.endTime,
    );

    /** Maximum attainable score across every definition level. */
    private readonly scoreMax = computed<number>(() => {
        const levels = this.resolvedLevels()?.levels ?? [];
        return levels.reduce((sum, level) => sum + level.maxScore, 0);
    });

    /** Fully derived trainee rows, or null before the first data lands. */
    protected readonly rows = computed<readonly TraineeRow[] | null>(() => {
        const rawRows = this.source.vm();
        const resolved = this.resolvedLevels();
        if (!rawRows || !resolved) return null;
        const currentNow = this.now();
        const currentScoreMax = this.scoreMax();
        const instanceEndMs = resolved.instance.endTime.getTime();
        return rawRows.map((raw) =>
            this.toTraineeRow(raw, resolved.levels, currentNow, currentScoreMax, instanceEndMs),
        );
    });

    /**
     * Run id of the selected trainee, emitted to the host. Two-way bindable so the
     * dashboard owns the selection state and shares it with the per-trainee panels.
     */
    readonly selectedRunId = model<number | null>(null);

    /** The selected trainee row, or null when the selection matches no row. */
    protected readonly selectedTrainee = computed<TraineeRow | null>(
        () => this.rows()?.find((row) => row.runId === this.selectedRunId()) ?? null,
    );

    /** Panel status reflecting the live source, downgraded to loading until levels resolve. */
    protected readonly status = computed<ChartSourceStatus>(() => {
        const sourceStatus = this.source.status();
        if (sourceStatus === 'ready' && !this.resolvedLevels()) return 'loading';
        return sourceStatus;
    });

    public constructor() {
        effect(() => {
            const rows = this.rows();
            if (!rows) return;
            const selected = this.selectedRunId();
            const stillPresent = selected !== null && rows.some((row) => row.runId === selected);
            if (!stillPresent) {
                this.selectedRunId.set(rows[0]?.runId ?? null);
            }
        });
    }

    /**
     * Sets the active selection to the chosen run.
     *
     * @param runId Run id of the row the user selected.
     */
    protected onSelect(runId: number): void {
        this.selectedRunId.set(runId);
    }

    /**
     * Derives one fully populated trainee row from its raw counterpart, the resolved
     * level axis, the current clock value, and the instance maximum score.
     *
     * @param raw           Raw run row with identity, cumulative scores, and level aggregates.
     * @param levels        Ordered level axis from the resolved training definition.
     * @param currentNow    Current clock value in milliseconds.
     * @param currentScoreMax Maximum attainable score across all levels.
     * @param instanceEndMs Instance end timestamp in milliseconds, capping every run duration.
     */
    private toTraineeRow(
        raw: TraineeRawRow,
        levels: readonly LevelBasicView[],
        currentNow: number,
        currentScoreMax: number,
        instanceEndMs: number,
    ): TraineeRow {
        const state: RunState = raw.hasEndedRow ? 'finished' : 'running';
        const elapsedMs = runDurationMs(raw, currentNow, instanceEndMs);

        const rawByOrder = new Map<number, TraineeLevelRaw>(raw.levels.map((level) => [level.levelOrder, level]));
        const currentLevelOrder = raw.levels.reduce(
            (max, level) => (level.startedTimestamp !== null && level.levelOrder > max ? level.levelOrder : max),
            -1,
        );

        const clearedScoreSum = raw.levels.reduce(
            (sum, level) => (level.completedTimestamp !== null ? sum + (level.completedScore ?? 0) : sum),
            0,
        );
        const inProgressScore = Math.max(0, raw.trainingScore + raw.assessmentScore - clearedScoreSum);

        const levelProgresses = levels.map((level) =>
            this.toLevelProgress(rawByOrder.get(level.order), level, currentLevelOrder, inProgressScore),
        );

        const levelsCompleted = levelProgresses.filter((level) => level.status === 'cleared').length;
        const hintsTotal = levelProgresses.reduce((sum, level) => sum + level.hintCount, 0);
        const solutionsTotal = levelProgresses.reduce((sum, level) => sum + level.solutionCount, 0);
        const wrongAnswersTotal = levelProgresses.reduce((sum, level) => sum + level.wrongCount, 0);

        const currentLevel = levels.find((level) => level.order === currentLevelOrder) ?? null;
        const currentLevelRaw = currentLevel ? rawByOrder.get(currentLevel.order) : undefined;
        const currentLevelInProgress =
            currentLevelRaw?.startedTimestamp != null && currentLevelRaw.completedTimestamp == null;
        const timeInLevelMs =
            state === 'running' && currentLevelInProgress && currentLevelRaw?.startedTimestamp != null
                ? currentNow - currentLevelRaw.startedTimestamp
                : 0;

        return {
            runId: raw.runId,
            name: raw.traineeName,
            login: raw.traineeLogin,
            email: raw.traineeEmail,
            picture: raw.traineePicture,
            state,
            currentTimeMs: elapsedMs,
            currentTimeText: this.formatDuration(elapsedMs),
            currentLevelOrder,
            currentLevelLabel: currentLevel ? `L${currentLevel.order + 1} · ${currentLevel.title}` : '—',
            timeInLevelMs,
            timeInLevelText: timeInLevelMs > 0 ? this.formatDuration(timeInLevelMs) : '—',
            hintsTotal,
            solutionsTotal,
            wrongAnswersTotal,
            scoreTotal: raw.trainingScore + raw.assessmentScore,
            assessmentScore: raw.assessmentScore,
            scoreMax: currentScoreMax,
            levelsCompleted,
            levelsTotal: levels.length,
            startedText: format(raw.startTimestamp, TIME_OF_DAY_FORMAT),
            endedText: raw.hasEndedRow && raw.endEndTime !== null ? format(raw.endEndTime, TIME_OF_DAY_FORMAT) : null,
            levels: levelProgresses,
        };
    }

    /**
     * Derives one level's progress from its raw aggregate and axis metadata. Hint
     * and solution counts apply only to training levels; wrong-answer counts apply
     * to training and access levels.
     *
     * @param rawLevel          Raw per-level aggregate, or undefined when never entered.
     * @param level             Axis metadata (order, title, max score) for the level.
     * @param currentLevelOrder Order of the run's current level.
     * @param inProgressScore   Score attributed to the run's in-progress level.
     */
    private toLevelProgress(
        rawLevel: TraineeLevelRaw | undefined,
        level: LevelBasicView,
        currentLevelOrder: number,
        inProgressScore: number,
    ): LevelProgress {
        const started = rawLevel?.startedTimestamp ?? null;
        const completed = rawLevel?.completedTimestamp ?? null;
        const status: LevelStatus = completed !== null ? 'cleared' : started !== null ? 'in-progress' : 'not-started';

        const levelType = rawLevel?.levelType ?? null;
        const isTraining = levelType !== null && TRAINING_LEVEL_TYPES.has(levelType);
        const isAccess = levelType !== null && ACCESS_LEVEL_TYPES.has(levelType);

        const isCurrent = level.order === currentLevelOrder;
        const score =
            status === 'cleared'
                ? rawLevel?.completedScore ?? 0
                : status === 'in-progress' && isCurrent
                  ? inProgressScore
                  : 0;

        const timeText =
            completed !== null && started !== null ? this.formatDuration(completed - started) : '—';

        return {
            order: level.order,
            title: level.title,
            status,
            score,
            maxScore: level.maxScore,
            timeText,
            hintCount: isTraining ? rawLevel?.hintCount ?? 0 : 0,
            solutionCount: isTraining ? rawLevel?.solutionCount ?? 0 : 0,
            wrongCount: isTraining || isAccess ? rawLevel?.wrongCount ?? 0 : 0,
        };
    }

    /**
     * Formats a millisecond duration as an abbreviated hours-and-minutes string
     * (e.g. "1h 47m", "8m", "<1m").
     *
     * @param durationMs Duration in milliseconds to format.
     */
    private formatDuration(durationMs: number): string {
        const safeMs = Math.max(0, Math.round(durationMs));
        const duration = intervalToDuration({ start: 0, end: safeMs });
        const hours = (duration.days ?? 0) * 24 + (duration.hours ?? 0);
        const minutes = duration.minutes ?? 0;
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        return '<1m';
    }
}
