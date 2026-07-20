import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of, switchMap } from 'rxjs';
import {
    EntityResolverService,
    EntityType,
    EventCacheDb,
    hintTakenTable,
    levelCompletedTable,
    levelStartedTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    trainingRunStartedTable,
    wrongAnswerSubmittedTable,
} from '@crczp/event-query-engine';
import {
    createQuerySource,
    queryLatestRunScoreMaps,
    QuerySource,
    SCORE_BEARING_EVENT_TYPES,
} from '../shared';

/** One started run, left-joined with its ended counterpart for lifecycle and timing. */
interface RunTimingRow {
    /** Training run identifier. */
    readonly training_run_id: number;
    /** User whose run this belongs to. */
    readonly user_ref_id: number;
    /** Unix millisecond timestamp when the run started. */
    readonly start_timestamp: number;
    /** Non-null when the run has a training_run_ended row, indicating a finished run. */
    readonly ended_run_id: number | null;
    /** Absolute Unix millisecond start time from the ended row; null while running. */
    readonly end_start_time: number | null;
    /** Absolute Unix millisecond end time from the ended row; null while running. */
    readonly end_end_time: number | null;
}

/** One level_started row, projected to the fields driving level progress. */
interface LevelStartedRow {
    /** Training run that entered the level. */
    readonly training_run_id: number;
    /** Zero-based position of the level entered. */
    readonly level_order: number;
    /** Level type discriminator (training, assessment, info, access). */
    readonly level_type: string;
    /** Unix millisecond timestamp of the entry. */
    readonly timestamp: number;
}

/** One level_completed row, projected to the fields driving level progress. */
interface LevelCompletedRow {
    /** Training run that completed the level. */
    readonly training_run_id: number;
    /** Zero-based position of the level completed. */
    readonly level_order: number;
    /** Unix millisecond timestamp of the completion. */
    readonly timestamp: number;
    /** Score attained on the level at completion. */
    readonly actual_score_in_level: number;
}

/** One run-and-level keyed penalty row (hint or solution): one row per occurrence. */
interface RunLevelRow {
    /** Training run the occurrence belongs to. */
    readonly training_run_id: number;
    /** Zero-based level position the occurrence happened on. */
    readonly level_order: number;
}

/** One wrong_answer_submitted row carrying its repetition count. */
interface WrongAnswerRow {
    /** Training run that submitted the wrong answer. */
    readonly training_run_id: number;
    /** Zero-based level position the answer was submitted on. */
    readonly level_order: number;
    /** Number of times this wrong answer was submitted. */
    readonly count: number;
}

/** Combined results from all sub-queries for one polling cycle. */
export interface TraineeOverviewAggregateRow {
    /** One row per started run, left-joined with its ended counterpart. */
    readonly timingRows: readonly RunTimingRow[];
    /** All level-entry events for the instance. */
    readonly levelStartedRows: readonly LevelStartedRow[];
    /** All level-completion events for the instance. */
    readonly levelCompletedRows: readonly LevelCompletedRow[];
    /** All hint-taken events for the instance. */
    readonly hintRows: readonly RunLevelRow[];
    /** All solution-displayed events for the instance. */
    readonly solutionRows: readonly RunLevelRow[];
    /** All wrong-answer events for the instance. */
    readonly wrongRows: readonly WrongAnswerRow[];
    /** Latest cumulative training score per run. */
    readonly latestTrainingScoreByRunId: ReadonlyMap<number, number>;
    /** Latest cumulative assessment score per run. */
    readonly latestAssessmentScoreByRunId: ReadonlyMap<number, number>;
}

/** Per-level aggregate for one run, before clock-driven derivations. */
export interface TraineeLevelRaw {
    /** Zero-based level position. */
    readonly levelOrder: number;
    /** Level type discriminator, or null when the level was never entered. */
    readonly levelType: string | null;
    /** Latest entry timestamp, or null when never entered. */
    readonly startedTimestamp: number | null;
    /** Latest completion timestamp, or null when not completed. */
    readonly completedTimestamp: number | null;
    /** Score attained at completion, or null when not completed. */
    readonly completedScore: number | null;
    /** Hints taken on the level. */
    readonly hintCount: number;
    /** Solutions revealed on the level. */
    readonly solutionCount: number;
    /** Wrong answers submitted on the level (summed repetition counts). */
    readonly wrongCount: number;
}

/**
 * Per-run data emitted by the source after trainee name resolution. Lifecycle
 * state, durations, level statuses, and display text are derived in the
 * component's reactive computed context against the clock and resolved levels.
 */
export interface TraineeRawRow {
    /** Training run identifier (stable key for Angular track-by). */
    readonly runId: number;
    /** User ID for reference. */
    readonly userId: number;
    /** Resolved display name, falling back to login then numeric id string. */
    readonly traineeName: string;
    /** Resolved login. */
    readonly traineeLogin: string;
    /** Resolved email. */
    readonly traineeEmail: string;
    /** Raw base64 avatar picture; empty string when none. */
    readonly traineePicture: string;
    /** Unix millisecond timestamp when the run started. */
    readonly startTimestamp: number;
    /** Absolute Unix millisecond start time from the ended row; null while running. */
    readonly endStartTime: number | null;
    /** Absolute Unix millisecond end time from the ended row; null while running. */
    readonly endEndTime: number | null;
    /** Whether the run has a training_run_ended row. */
    readonly hasEndedRow: boolean;
    /** Latest cumulative training score. */
    readonly trainingScore: number;
    /** Latest cumulative assessment score. */
    readonly assessmentScore: number;
    /** Per-level aggregates keyed by level order. */
    readonly levels: readonly TraineeLevelRaw[];
}

/**
 * Issues every sub-query against the local event cache and combines them with the
 * latest-by-timestamp run score maps into a single {@link TraineeOverviewAggregateRow}.
 *
 * @param db               The local event-cache database.
 * @param instanceIdValue  The instance ID to scope the queries to.
 */
function buildTraineeOverviewQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<TraineeOverviewAggregateRow[]> {
    const timingRows$ = from(
        db
            .select({
                training_run_id: trainingRunStartedTable.training_run_id,
                user_ref_id: trainingRunStartedTable.user_ref_id,
                start_timestamp: trainingRunStartedTable.timestamp,
                ended_run_id: trainingRunEndedTable.training_run_id,
                end_start_time: trainingRunEndedTable.start_time,
                end_end_time: trainingRunEndedTable.end_time,
            })
            .from(trainingRunStartedTable)
            .leftJoin(
                trainingRunEndedTable,
                eq(trainingRunEndedTable.training_run_id, trainingRunStartedTable.training_run_id),
            )
            .where(eq(trainingRunStartedTable.instance_id, instanceIdValue)) as Promise<RunTimingRow[]>,
    );

    const levelStartedRows$ = from(
        db
            .select({
                training_run_id: levelStartedTable.training_run_id,
                level_order: levelStartedTable.level_order,
                level_type: levelStartedTable.level_type,
                timestamp: levelStartedTable.timestamp,
            })
            .from(levelStartedTable)
            .where(eq(levelStartedTable.instance_id, instanceIdValue)) as Promise<LevelStartedRow[]>,
    );

    const levelCompletedRows$ = from(
        db
            .select({
                training_run_id: levelCompletedTable.training_run_id,
                level_order: levelCompletedTable.level_order,
                timestamp: levelCompletedTable.timestamp,
                actual_score_in_level: levelCompletedTable.actual_score_in_level,
            })
            .from(levelCompletedTable)
            .where(eq(levelCompletedTable.instance_id, instanceIdValue)) as Promise<LevelCompletedRow[]>,
    );

    const hintRows$ = from(
        db
            .select({
                training_run_id: hintTakenTable.training_run_id,
                level_order: hintTakenTable.level_order,
            })
            .from(hintTakenTable)
            .where(eq(hintTakenTable.instance_id, instanceIdValue)) as Promise<RunLevelRow[]>,
    );

    const solutionRows$ = from(
        db
            .select({
                training_run_id: solutionDisplayedTable.training_run_id,
                level_order: solutionDisplayedTable.level_order,
            })
            .from(solutionDisplayedTable)
            .where(eq(solutionDisplayedTable.instance_id, instanceIdValue)) as Promise<RunLevelRow[]>,
    );

    const wrongRows$ = from(
        db
            .select({
                training_run_id: wrongAnswerSubmittedTable.training_run_id,
                level_order: wrongAnswerSubmittedTable.level_order,
                count: wrongAnswerSubmittedTable.count,
            })
            .from(wrongAnswerSubmittedTable)
            .where(eq(wrongAnswerSubmittedTable.instance_id, instanceIdValue)) as Promise<WrongAnswerRow[]>,
    );

    return combineLatest({
        timingRows: timingRows$,
        levelStartedRows: levelStartedRows$,
        levelCompletedRows: levelCompletedRows$,
        hintRows: hintRows$,
        solutionRows: solutionRows$,
        wrongRows: wrongRows$,
        scoreMaps: queryLatestRunScoreMaps(db, instanceIdValue),
    }).pipe(
        map(({ timingRows, levelStartedRows, levelCompletedRows, hintRows, solutionRows, wrongRows, scoreMaps }) => [
            {
                timingRows,
                levelStartedRows,
                levelCompletedRows,
                hintRows,
                solutionRows,
                wrongRows,
                latestTrainingScoreByRunId: scoreMaps.latestTrainingScoreByRunId,
                latestAssessmentScoreByRunId: scoreMaps.latestAssessmentScoreByRunId,
            },
        ]),
    );
}

/** Mutable per-run accumulator used while folding the level events. */
interface RunLevelAccumulator {
    levelType: string | null;
    startedTimestamp: number | null;
    completedTimestamp: number | null;
    completedScore: number | null;
    hintCount: number;
    solutionCount: number;
    wrongCount: number;
}

/**
 * Returns the per-run, per-level accumulator for the given keys, creating it on
 * first access so callers can mutate it in place.
 *
 * @param byRun       Map from run id to its per-level-order accumulator map.
 * @param runId       Training run identifier.
 * @param levelOrder  Zero-based level position.
 */
function levelAccumulator(
    byRun: Map<number, Map<number, RunLevelAccumulator>>,
    runId: number,
    levelOrder: number,
): RunLevelAccumulator {
    let byOrder = byRun.get(runId);
    if (!byOrder) {
        byOrder = new Map<number, RunLevelAccumulator>();
        byRun.set(runId, byOrder);
    }
    let accumulator = byOrder.get(levelOrder);
    if (!accumulator) {
        accumulator = {
            levelType: null,
            startedTimestamp: null,
            completedTimestamp: null,
            completedScore: null,
            hintCount: 0,
            solutionCount: 0,
            wrongCount: 0,
        };
        byOrder.set(levelOrder, accumulator);
    }
    return accumulator;
}

/**
 * Folds all level, hint, solution, and wrong-answer events into a per-run map of
 * per-level-order aggregates. Latest-by-timestamp wins for entry and completion.
 *
 * @param combined  The single combined aggregate row for the polling cycle.
 */
function aggregateLevels(combined: TraineeOverviewAggregateRow): Map<number, readonly TraineeLevelRaw[]> {
    const byRun = new Map<number, Map<number, RunLevelAccumulator>>();

    for (const row of combined.levelStartedRows) {
        const accumulator = levelAccumulator(byRun, row.training_run_id, row.level_order);
        accumulator.levelType = row.level_type;
        if (accumulator.startedTimestamp === null || row.timestamp > accumulator.startedTimestamp) {
            accumulator.startedTimestamp = row.timestamp;
        }
    }

    for (const row of combined.levelCompletedRows) {
        const accumulator = levelAccumulator(byRun, row.training_run_id, row.level_order);
        if (accumulator.completedTimestamp === null || row.timestamp > accumulator.completedTimestamp) {
            accumulator.completedTimestamp = row.timestamp;
            accumulator.completedScore = row.actual_score_in_level;
        }
    }

    for (const row of combined.hintRows) {
        levelAccumulator(byRun, row.training_run_id, row.level_order).hintCount += 1;
    }

    for (const row of combined.solutionRows) {
        levelAccumulator(byRun, row.training_run_id, row.level_order).solutionCount += 1;
    }

    for (const row of combined.wrongRows) {
        levelAccumulator(byRun, row.training_run_id, row.level_order).wrongCount += row.count;
    }

    const result = new Map<number, readonly TraineeLevelRaw[]>();
    for (const [runId, byOrder] of byRun) {
        const levels = [...byOrder.entries()]
            .map(([levelOrder, accumulator]): TraineeLevelRaw => ({ levelOrder, ...accumulator }))
            .sort((levelA, levelB) => levelA.levelOrder - levelB.levelOrder);
        result.set(runId, levels);
    }
    return result;
}

/**
 * Transforms the combined query row into intermediate run rows ready for trainee
 * name resolution. Lifecycle state, durations, and level statuses are derived in
 * the component's reactive computed context.
 *
 * @param rows  Array with exactly one element — the combined event and score data.
 */
function extractRunRows(
    rows: readonly TraineeOverviewAggregateRow[],
): readonly Omit<TraineeRawRow, 'traineeName' | 'traineeLogin' | 'traineeEmail' | 'traineePicture'>[] {
    const combined = rows[0];
    if (!combined) return [];

    const levelsByRun = aggregateLevels(combined);

    return combined.timingRows.map((row) => ({
        runId: row.training_run_id,
        userId: row.user_ref_id,
        startTimestamp: row.start_timestamp,
        endStartTime: row.end_start_time,
        endEndTime: row.end_end_time,
        hasEndedRow: row.ended_run_id !== null,
        trainingScore: combined.latestTrainingScoreByRunId.get(row.training_run_id) ?? 0,
        assessmentScore: combined.latestAssessmentScoreByRunId.get(row.training_run_id) ?? 0,
        levels: levelsByRun.get(row.training_run_id) ?? [],
    }));
}

/**
 * Resolves distinct user IDs from the run rows to trainee identities and joins
 * them inline, producing a fully populated {@link TraineeRawRow} per run.
 *
 * @param runRows   Extracted run rows carrying user IDs but no resolved identity.
 * @param resolver  Entity resolver service for user lookups.
 */
function resolveTraineeIdentities(
    runRows: readonly Omit<TraineeRawRow, 'traineeName' | 'traineeLogin' | 'traineeEmail' | 'traineePicture'>[],
    resolver: EntityResolverService,
): Observable<TraineeRawRow[]> {
    if (runRows.length === 0) {
        return of([]);
    }

    const userIds = [...new Set(runRows.map((row) => row.userId))];

    return resolver.resolveMap(EntityType.User, userIds).pipe(
        map((userMap) =>
            runRows.map((row): TraineeRawRow => {
                const user = userMap.get(row.userId);
                return {
                    ...row,
                    traineeName: user?.name ?? user?.login ?? String(row.userId),
                    traineeLogin: user?.login ?? '',
                    traineeEmail: user?.mail ?? '',
                    traineePicture: user?.picture ?? '',
                };
            }),
        ),
    );
}

/**
 * Creates a live-polling QuerySource for the trainee-overview table and card.
 * Emits one raw row per run with resolved identity, run-wide cumulative scores,
 * and per-level event aggregates. Clock-driven derivations (elapsed time, level
 * statuses, display text) happen in the component's computed context.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId  Reactive signal carrying the training instance ID.
 * @param resolver    Entity resolver for user lookups, injected from the component.
 */
export function createTraineeOverviewSource(
    instanceId: Signal<number>,
    resolver: EntityResolverService,
): QuerySource<readonly TraineeRawRow[]> {
    return createQuerySource<TraineeRawRow, readonly TraineeRawRow[]>({
        instanceId,
        eventTypes: [...SCORE_BEARING_EVENT_TYPES],
        live: true,
        query: (db, ctx) =>
            buildTraineeOverviewQuery(db, ctx.instanceId).pipe(
                switchMap((rows) => resolveTraineeIdentities(extractRunRows(rows), resolver)),
            ),
        map: (rows) => rows,
        isEmpty: (rows) => rows.length === 0,
    });
}
