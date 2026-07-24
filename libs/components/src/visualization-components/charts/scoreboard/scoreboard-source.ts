import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of, switchMap } from 'rxjs';
import {
    EntityResolverService,
    EntityType,
    EventCacheDb,
    trainingRunEndedTable,
    trainingRunStartedTable,
} from '@crczp/event-query-engine';
import {
    createQuerySource,
    QuerySource,
    queryLatestRunScoreMaps,
    RichTooltipModel,
    RunState,
    SCORE_BEARING_EVENT_TYPES,
} from '../shared';

/** One row per started run, left-joined with its ended counterpart for timing. */
interface RunTimingRow {
    /** Training run identifier. */
    readonly training_run_id: number;
    /** User whose run this belongs to. */
    readonly user_ref_id: number;
    /**
     * Unix millisecond timestamp when the run started, taken from the
     * training_run_started table's own timestamp column (present for all runs).
     */
    readonly start_timestamp: number;
    /**
     * Non-null when the run has a training_run_ended row, indicating a finished run.
     */
    readonly ended_run_id: number | null;
    /**
     * Absolute Unix millisecond start time recorded by the ended row.
     * Null for running runs.
     */
    readonly end_start_time: number | null;
    /**
     * Absolute Unix millisecond end time recorded by the ended row.
     * Null for running runs.
     */
    readonly end_end_time: number | null;
}

/**
 * Combined results from all sub-queries for one polling cycle.
 * Wrapped in a single-element array to satisfy the TRow[] shape of QuerySourceConfig.
 */
export interface ScoreboardAggregateRow {
    readonly timingRows: readonly RunTimingRow[];
    readonly latestTrainingScoreByRunId: ReadonlyMap<number, number>;
    readonly latestAssessmentScoreByRunId: ReadonlyMap<number, number>;
}

/**
 * Per-run data emitted by the source after trainee name resolution.
 * State, duration, and rank are derived in the component's reactive computed context.
 */
export interface ScoreboardRawRow {
    /** Training run identifier (stable key for Angular track-by). */
    readonly trainingRunId: number;
    /** User ID for reference. */
    readonly userId: number;
    /** Resolved display name, falling back to login then numeric id string. */
    readonly traineeName: string;
    /** Resolved login (for CSV). */
    readonly traineeLogin: string;
    /** Resolved email (for CSV). */
    readonly traineeEmail: string;
    /** Raw base64 avatar picture of the trainee; empty string when none. */
    readonly traineePicture: string;
    /** Cumulative training-level score from the latest-by-timestamp event. */
    readonly totalTrainingScore: number;
    /** Cumulative assessment-level score from the latest-by-timestamp event. */
    readonly totalAssessmentScore: number;
    /** Unix millisecond timestamp when the run started. */
    readonly startTimestamp: number;
    /**
     * Absolute Unix millisecond start time from the ended row.
     * Null for running runs.
     */
    readonly endStartTime: number | null;
    /**
     * Absolute Unix millisecond end time from the ended row.
     * Null for running runs.
     */
    readonly endEndTime: number | null;
    /** Whether the run has a training_run_ended row. */
    readonly hasEndedRow: boolean;
}

/** One row of the rendered scoreboard, after ranking and user resolution. */
export interface ScoreboardRow {
    /** 1-based sequential rank by combined score desc, then shorter time asc. */
    readonly rank: number;
    /** Training run identifier (stable key for Angular track-by). */
    readonly trainingRunId: number;
    /** User ID for reference. */
    readonly userId: number;
    /** Resolved display name, falling back to login then numeric id string. */
    readonly traineeName: string;
    /** Resolved login (for CSV). */
    readonly traineeLogin: string;
    /** Resolved email (for CSV). */
    readonly traineeEmail: string;
    /** Raw base64 avatar picture of the trainee; empty string when none. */
    readonly traineePicture: string;
    /** Cumulative training-level score (split out for CSV). */
    readonly totalTrainingScore: number;
    /** Cumulative assessment-level score (split out for CSV). */
    readonly totalAssessmentScore: number;
    /** Combined score (totalTrainingScore + totalAssessmentScore). */
    readonly combinedScore: number;
    /** Duration in milliseconds: end_time - start_time for finished runs. */
    readonly durationMs: number;
    /** Lifecycle state: running or finished. */
    readonly state: RunState;
    /** Human-readable state label ('Running' or 'Finished'). */
    readonly stateLabel: string;
    /** Pre-formatted abbreviated duration string (e.g. "1h 42m"). */
    readonly durationText: string;
    /** Pre-formatted score display string (e.g. "75 / 100"). */
    readonly scoreText: string;
    /** Score as a rounded percentage of the maximum attainable score. */
    readonly percent: number;
    /** Structured hover tooltip showing the full per-run breakdown. */
    readonly tooltip: RichTooltipModel;
}

/** Full view-model for the scoreboard table. */
export interface ScoreboardVm {
    /** Ranked rows in default order (score desc, then time asc). */
    readonly rows: readonly ScoreboardRow[];
    /** Maximum attainable combined score for the instance — denominator for the display. */
    readonly maxScore: number;
}

/**
 * Issues the timing query against the local event cache and combines it with the
 * latest-by-timestamp run score maps into a single ScoreboardAggregateRow.
 *
 * @param db               The local event-cache database.
 * @param instanceIdValue  The instance ID to scope the queries to.
 */
function buildScoreboardQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<ScoreboardAggregateRow[]> {
    const timingQuery$ = from(
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

    return combineLatest({
        timingRows: timingQuery$,
        scoreMaps: queryLatestRunScoreMaps(db, instanceIdValue),
    }).pipe(
        map(({ timingRows, scoreMaps }) => [
            {
                timingRows,
                latestTrainingScoreByRunId: scoreMaps.latestTrainingScoreByRunId,
                latestAssessmentScoreByRunId: scoreMaps.latestAssessmentScoreByRunId,
            },
        ]),
    );
}

/**
 * Transforms the raw combined query rows into an array of intermediate run rows,
 * ready for trainee name resolution. State, duration, and rank are derived in the
 * component's reactive computed context so Angular's reactivity graph tracks them
 * correctly against the clock signal.
 *
 * @param rows  Array with exactly one element — the combined run and score data.
 */
function extractRunRows(rows: readonly ScoreboardAggregateRow[]): readonly Omit<ScoreboardRawRow, 'traineeName' | 'traineeLogin' | 'traineeEmail' | 'traineePicture'>[] {
    const combined = rows[0];
    if (!combined) return [];

    const { timingRows, latestTrainingScoreByRunId, latestAssessmentScoreByRunId } = combined;

    return timingRows.map((row) => {
        const hasEndedRow = row.ended_run_id !== null;

        return {
            trainingRunId: row.training_run_id,
            userId: row.user_ref_id,
            totalTrainingScore: latestTrainingScoreByRunId.get(row.training_run_id) ?? 0,
            totalAssessmentScore: latestAssessmentScoreByRunId.get(row.training_run_id) ?? 0,
            startTimestamp: row.start_timestamp,
            endStartTime: row.end_start_time,
            endEndTime: row.end_end_time,
            hasEndedRow,
        };
    });
}

/**
 * Resolves distinct user IDs from the run rows to trainee names and joins them
 * inline, producing a fully populated {@link ScoreboardRawRow} per run.
 *
 * @param runRows   Extracted run rows carrying user IDs but no resolved names.
 * @param resolver  Entity resolver service for user lookups.
 */
function resolveTraineeNames(
    runRows: readonly Omit<ScoreboardRawRow, 'traineeName' | 'traineeLogin' | 'traineeEmail' | 'traineePicture'>[],
    resolver: EntityResolverService,
): Observable<ScoreboardRawRow[]> {
    if (runRows.length === 0) {
        return of([]);
    }

    const userIds = [...new Set(runRows.map((row) => row.userId))];

    return resolver.resolveMap(EntityType.User, userIds).pipe(
        map((userMap) =>
            runRows.map((row): ScoreboardRawRow => {
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
 * Creates a live-polling QuerySource for scoreboard data. Scores are derived
 * from the latest-by-timestamp cumulative totals across all ten score-bearing
 * event tables, so they reflect the run's truly latest known event at every poll.
 *
 * Trainee names are resolved inside the query pipeline on every poll tick. The
 * resolver caches results per entity ID at the HTTP layer, so repeat resolutions
 * for already-seen user IDs are instant cache hits.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId  Reactive signal carrying the training instance ID.
 * @param resolver    Entity resolver for user lookups, injected from the component.
 */
export function createScoreboardSource(
    instanceId: Signal<number>,
    resolver: EntityResolverService,
): QuerySource<readonly ScoreboardRawRow[]> {
    return createQuerySource<ScoreboardRawRow, readonly ScoreboardRawRow[]>({
        instanceId,
        eventTypes: [...SCORE_BEARING_EVENT_TYPES],
        live: true,
        query: (db, ctx) => buildScoreboardQuery(db, ctx.instanceId).pipe(
            switchMap((rows) => resolveTraineeNames(extractRunRows(rows), resolver)),
        ),
        map: (rows) => rows,
        isEmpty: (rows) => rows.length === 0,
    });
}
