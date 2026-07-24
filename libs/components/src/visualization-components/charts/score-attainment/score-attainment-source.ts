import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable } from 'rxjs';
import {
    EventCacheDb,
    levelCompletedTable,
    trainingRunEndedTable,
    trainingRunStartedTable,
} from '@crczp/event-query-engine';
import {
    createQuerySource,
    LatestRunScoreMaps,
    QuerySource,
    queryLatestRunScoreMaps,
    SCORE_BEARING_EVENT_TYPES,
} from '../shared';

/** Lifecycle state of a run: finished once it has a training_run_ended row. */
export type RunState = 'running' | 'finished';

/** Per-run score attainment data: the absolute total and the run's completed levels. */
export interface RunScore {
    /** Training run identifier. */
    readonly runId: number;
    /** User whose run this belongs to (resolved to a name only at CSV export time). */
    readonly userId: number;
    /** Latest-by-timestamp cumulative score: training plus assessment. */
    readonly totalScore: number;
    /** Ascending level orders the run has a completion event for. */
    readonly completedOrders: readonly number[];
    /** Lifecycle state derived from the presence of a training_run_ended row. */
    readonly state: RunState;
}

/** One run-identity row: a started run left-joined with its ended counterpart. */
interface RunIdentityRow {
    readonly training_run_id: number;
    readonly user_ref_id: number;
    /** Non-null when the run has a training_run_ended row. */
    readonly ended_run_id: number | null;
}

/** One completed-level row identifying a run and the level it completed. */
interface CompletedLevelRow {
    readonly training_run_id: number;
    readonly level_order: number;
}

/** Combined results for one polling cycle, wrapped to the single-element TRow[] shape. */
interface ScoreAttainmentAggregateRow {
    readonly identityRows: readonly RunIdentityRow[];
    readonly scoreMaps: LatestRunScoreMaps;
    readonly completedOrdersByRunId: ReadonlyMap<number, number[]>;
}

/**
 * Queries started runs left-joined with their ended row, giving each run's identity
 * (run id, user) and finished/running state for the instance.
 *
 * @param db               The event-cache database.
 * @param instanceIdValue  The instance ID to scope the query to.
 * @returns Observable emitting one identity row per started run.
 */
function buildIdentityQuery(db: EventCacheDb, instanceIdValue: number): Observable<RunIdentityRow[]> {
    return from(
        db
            .select({
                training_run_id: trainingRunStartedTable.training_run_id,
                user_ref_id: trainingRunStartedTable.user_ref_id,
                ended_run_id: trainingRunEndedTable.training_run_id,
            })
            .from(trainingRunStartedTable)
            .leftJoin(
                trainingRunEndedTable,
                eq(trainingRunEndedTable.training_run_id, trainingRunStartedTable.training_run_id),
            )
            .where(eq(trainingRunStartedTable.instance_id, instanceIdValue)) as Promise<RunIdentityRow[]>,
    );
}

/**
 * Queries every level-completed event for the instance.
 *
 * @param db               The event-cache database.
 * @param instanceIdValue  The instance ID to scope the query to.
 * @returns Observable emitting one row per level-completed event.
 */
function buildCompletedLevelsQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<CompletedLevelRow[]> {
    return from(
        db
            .select({
                training_run_id: levelCompletedTable.training_run_id,
                level_order: levelCompletedTable.level_order,
            })
            .from(levelCompletedTable)
            .where(eq(levelCompletedTable.instance_id, instanceIdValue)) as Promise<CompletedLevelRow[]>,
    );
}

/**
 * Reduces completed-level rows to the ascending set of distinct completed level
 * orders per run.
 *
 * @param rows  Completed-level rows for one instance.
 * @returns Per-run ascending distinct level orders, keyed by run id.
 */
function aggregateCompletedOrders(rows: readonly CompletedLevelRow[]): Map<number, number[]> {
    const ordersByRunId = new Map<number, Set<number>>();
    for (const row of rows) {
        let orders = ordersByRunId.get(row.training_run_id);
        if (orders === undefined) {
            orders = new Set<number>();
            ordersByRunId.set(row.training_run_id, orders);
        }
        orders.add(row.level_order);
    }

    const result = new Map<number, number[]>();
    for (const [runId, orders] of ordersByRunId) {
        result.set(runId, [...orders].sort((first, second) => first - second));
    }
    return result;
}

/**
 * Issues the per-instance queries (run identity, latest score maps, completed levels)
 * and combines them into a single {@link ScoreAttainmentAggregateRow}.
 *
 * @param db               The event-cache database.
 * @param instanceIdValue  The instance ID to scope the queries to.
 * @returns Observable of a single-element aggregate-row array for one polling cycle.
 */
function buildScoreAttainmentQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<ScoreAttainmentAggregateRow[]> {
    return combineLatest({
        identityRows: buildIdentityQuery(db, instanceIdValue),
        scoreMaps: queryLatestRunScoreMaps(db, instanceIdValue),
        completedRows: buildCompletedLevelsQuery(db, instanceIdValue),
    }).pipe(
        map(({ identityRows, scoreMaps, completedRows }) => [
            { identityRows, scoreMaps, completedOrdersByRunId: aggregateCompletedOrders(completedRows) },
        ]),
    );
}

/**
 * Flattens the single aggregate row into one {@link RunScore} per run, joining the
 * latest cumulative score and the completed level orders onto each run identity.
 *
 * @param rows  Single-element aggregate-row array from {@link buildScoreAttainmentQuery}.
 * @returns One RunScore per started run on the instance.
 */
function mapRunScores(rows: readonly ScoreAttainmentAggregateRow[]): RunScore[] {
    const combined = rows[0];
    if (!combined) return [];

    const { identityRows, scoreMaps, completedOrdersByRunId } = combined;
    const { latestTrainingScoreByRunId, latestAssessmentScoreByRunId } = scoreMaps;

    return identityRows.map((row): RunScore => {
        const totalScore =
            (latestTrainingScoreByRunId.get(row.training_run_id) ?? 0) +
            (latestAssessmentScoreByRunId.get(row.training_run_id) ?? 0);
        return {
            runId: row.training_run_id,
            userId: row.user_ref_id,
            totalScore,
            completedOrders: completedOrdersByRunId.get(row.training_run_id) ?? [],
            state: row.ended_run_id !== null ? 'finished' : 'running',
        };
    });
}

/**
 * Creates a live-polling QuerySource emitting one {@link RunScore} per run on the
 * instance. Scores derive from the latest-by-timestamp cumulative totals; completed
 * levels derive from level_completed events. Trainee names are NOT resolved here — they
 * are resolved on demand at CSV export time.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId  Reactive signal carrying the training instance ID.
 * @returns Live QuerySource of per-run score attainment rows.
 */
export function createScoreAttainmentSource(
    instanceId: Signal<number>,
): QuerySource<readonly RunScore[]> {
    return createQuerySource<RunScore, readonly RunScore[]>({
        instanceId,
        eventTypes: [...SCORE_BEARING_EVENT_TYPES],
        live: true,
        query: (db, ctx) => buildScoreAttainmentQuery(db, ctx.instanceId).pipe(map(mapRunScores)),
        map: (rows) => rows,
        isEmpty: (rows) => rows.length === 0,
    });
}
