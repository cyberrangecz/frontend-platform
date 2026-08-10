import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable } from 'rxjs';
import {
    EntityResolverService,
    EventCacheDb,
    hintTakenTable,
    levelStartedTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    trainingRunStartedTable,
} from '@crczp/event-query-engine';
import {
    PlatformEventType,
    TrainingInstanceBasic
} from '@crczp/training-model';
import { Utils } from '@crczp/utils';
import { createQuerySource, QuerySource, resolveInstanceLevels } from '../shared';

/** One row per started run, left-joined with its ended counterpart. */
export interface RunStatusRow {
    readonly training_run_id: number;
    readonly ended_run_id: number | null;
    readonly total_training_level_score: number | null;
    readonly total_assessment_level_score: number | null;
    /** Unix milliseconds at which the run started — null when the run has not ended. */
    readonly start_time: number | null;
    /** Unix milliseconds at which the run ended — null when the run has not ended. */
    readonly end_time: number | null;
}

/** One row per level-started event — carries per-run progress data. */
export interface LevelEventRow {
    readonly training_run_id: number;
    readonly level_order: number;
}

/** One row per hint-taken event scoped to the instance. */
export interface HintEventRow {
    readonly id: string;
}

/** One row per solution-displayed event scoped to the instance. */
export interface SolutionEventRow {
    readonly id: string;
}

/**
 * Container for the four sub-query results that make up one live polling cycle.
 * Wrapped in an array so it satisfies the `TRow[]` contract of {@link QuerySourceConfig}.
 */
export interface LiveAggregateRow {
    readonly runStatusRows: readonly RunStatusRow[];
    readonly levelEventRows: readonly LevelEventRow[];
    readonly hintEventRows: readonly HintEventRow[];
    readonly solutionEventRows: readonly SolutionEventRow[];
}

/** Start and end timestamps in milliseconds of a single ended run. */
export interface EndedRunTiming {
    readonly startMs: number;
    readonly endMs: number;
}

/** Live view-model derived from event-cache data. */
export interface LiveOverviewVm {
    readonly traineeCount: number;
    readonly activeRunIds: ReadonlySet<number>;
    readonly finishedCount: number;
    readonly endedScores: readonly number[];
    readonly maxLevelOrderByRunId: ReadonlyMap<number, number>;
    /** Start and end timestamps in milliseconds for each ended run. */
    readonly endedRunTimings: readonly EndedRunTiming[];
    /** Total hint-taken events for the instance. */
    readonly hintCount: number;
    /** Total solution-displayed events for the instance. */
    readonly solutionCount: number;
}

/**
 * Static view-model derived from entity resolution.
 * Level metadata is sourced from the resolved training definition rather than
 * live events so it is available before any trainee has started a level.
 */
export interface StaticOverviewVm {
    readonly instance: TrainingInstanceBasic;
    /** Total number of levels in the training definition. */
    readonly levelCount: number;
    /** Sum of maximum attainable scores across all levels. */
    readonly maxScore: number;
    /** Map of 0-based level order to level title. */
    readonly levelTitleByOrder: ReadonlyMap<number, string>;
}

/**
 * Resolves the training instance and its definition, re-resolving whenever the
 * instance ID signal changes. Reads the signal reactively so it is safe to
 * construct from a component field initializer before a required input has its
 * value. Does not poll the event cache.
 *
 * If the instance is not found, emits null so all tiles degrade gracefully.
 * If the definition is not found, emits the instance with zeroed/empty level
 * metadata — this preserves the Schedule and Status tiles while level-derived
 * tiles show the empty placeholder value.
 *
 * @param instanceId  Reactive instance ID signal.
 * @param resolver    The entity resolver service.
 */
export function buildStaticStream(
    instanceId: Signal<number>,
    resolver: EntityResolverService,
): Observable<StaticOverviewVm | null> {
    return resolveInstanceLevels(instanceId, resolver).pipe(
        map((resolved) => {
            if (resolved === null) return null;
            const { instance, levels } = resolved;
            return {
                instance,
                levelCount: levels.length,
                maxScore: Utils.Array.sum(levels.map((level) => level.maxScore)),
                levelTitleByOrder: new Map<number, string>(levels.map((level) => [level.order, level.title])),
            };
        }),
    );
}

/**
 * Creates a live-polling {@link QuerySource} for run, level, hint, and solution
 * event aggregates. Polls on the dashboard cadence, participates in the pause
 * gate, and stops past instance end-time.
 *
 * @param instanceId  Reactive instance ID signal.
 */
export function createLiveOverviewSource(
    instanceId: Signal<number>,
): QuerySource<LiveOverviewVm> {
    return createQuerySource<LiveAggregateRow, LiveOverviewVm>({
        instanceId,
        eventTypes: [
            PlatformEventType.TRAINING_RUN_STARTED,
            PlatformEventType.TRAINING_RUN_ENDED,
            PlatformEventType.LEVEL_STARTED,
            PlatformEventType.HINT_TAKEN,
            PlatformEventType.SOLUTION_DISPLAYED,
        ],
        live: true,
        query: (db, ctx) => buildLiveQuery(db, ctx.instanceId),
        map: (rows) => mapLiveRows(rows),
    });
}

/**
 * Issues four Drizzle queries against the local event cache scoped to the given
 * instance and combines them into a single {@link LiveAggregateRow}.
 *
 * Query 1: every started run left-joined with its ended row (including timing columns).
 * Query 2: every level-started row, carrying training run ID and level order.
 * Query 3: every hint-taken row (id only) to count total hints.
 * Query 4: every solution-displayed row (id only) to count total solutions.
 *
 * @param db               The local event-cache database.
 * @param instanceIdValue  The resolved instance ID to scope the queries to.
 */
function buildLiveQuery(db: EventCacheDb, instanceIdValue: number): Observable<LiveAggregateRow[]> {
    const runStatusQuery$ = from(
        db
            .select({
                training_run_id: trainingRunStartedTable.training_run_id,
                ended_run_id: trainingRunEndedTable.training_run_id,
                total_training_level_score: trainingRunEndedTable.total_training_level_score,
                total_assessment_level_score: trainingRunEndedTable.total_assessment_level_score,
                start_time: trainingRunEndedTable.start_time,
                end_time: trainingRunEndedTable.end_time,
            })
            .from(trainingRunStartedTable)
            .leftJoin(
                trainingRunEndedTable,
                eq(trainingRunEndedTable.training_run_id, trainingRunStartedTable.training_run_id),
            )
            .where(eq(trainingRunStartedTable.instance_id, instanceIdValue)) as Promise<RunStatusRow[]>,
    );

    const levelEventQuery$ = from(
        db
            .select({
                training_run_id: levelStartedTable.training_run_id,
                level_order: levelStartedTable.level_order,
            })
            .from(levelStartedTable)
            .where(eq(levelStartedTable.instance_id, instanceIdValue)) as Promise<LevelEventRow[]>,
    );

    const hintEventQuery$ = from(
        db
            .select({
                id: hintTakenTable.id,
            })
            .from(hintTakenTable)
            .where(eq(hintTakenTable.instance_id, instanceIdValue)) as Promise<HintEventRow[]>,
    );

    const solutionEventQuery$ = from(
        db
            .select({
                id: solutionDisplayedTable.id,
            })
            .from(solutionDisplayedTable)
            .where(eq(solutionDisplayedTable.instance_id, instanceIdValue)) as Promise<SolutionEventRow[]>,
    );

    return combineLatest([runStatusQuery$, levelEventQuery$, hintEventQuery$, solutionEventQuery$]).pipe(
        map(([runStatusRows, levelEventRows, hintEventRows, solutionEventRows]) => [
            { runStatusRows, levelEventRows, hintEventRows, solutionEventRows },
        ]),
    );
}

/**
 * Transforms the raw combined query rows into the structured {@link LiveOverviewVm}.
 *
 * @param rows  Array with exactly one element — the combined run-status, level-event,
 *              hint-event, and solution-event data.
 */
function mapLiveRows(rows: readonly LiveAggregateRow[]): LiveOverviewVm {
    const combined = rows[0];
    if (!combined) {
        return {
            traineeCount: 0,
            activeRunIds: new Set<number>(),
            finishedCount: 0,
            endedScores: [],
            maxLevelOrderByRunId: new Map<number, number>(),
            endedRunTimings: [],
            hintCount: 0,
            solutionCount: 0,
        };
    }

    const { runStatusRows, levelEventRows, hintEventRows, solutionEventRows } = combined;

    const startedRunIds = new Set<number>(runStatusRows.map((row) => row.training_run_id));
    const endedRunIds = new Set<number>(
        runStatusRows
            .filter((row) => row.ended_run_id !== null)
            .map((row) => row.training_run_id),
    );
    const activeRunIds = new Set<number>(
        [...startedRunIds].filter((id) => !endedRunIds.has(id)),
    );

    const endedRows = runStatusRows.filter((row) => row.ended_run_id !== null);

    const endedScores: number[] = endedRows.map(
        (row) => (row.total_training_level_score ?? 0) + (row.total_assessment_level_score ?? 0),
    );

    const endedRunTimings: EndedRunTiming[] = endedRows
        .filter((row): row is RunStatusRow & { start_time: number; end_time: number } =>
            row.start_time !== null && row.end_time !== null)
        .map((row) => ({ startMs: row.start_time, endMs: row.end_time }));

    return {
        traineeCount: startedRunIds.size,
        activeRunIds,
        finishedCount: endedRunIds.size,
        endedScores,
        maxLevelOrderByRunId: buildMaxLevelOrderMap(levelEventRows),
        endedRunTimings,
        hintCount: hintEventRows.length,
        solutionCount: solutionEventRows.length,
    };
}

/**
 * Reduces level-started rows to a map of training_run_id → maximum observed level_order.
 *
 * @param rows  Raw level-started rows, one per level-started event.
 */
function buildMaxLevelOrderMap(rows: readonly LevelEventRow[]): ReadonlyMap<number, number> {
    const result = new Map<number, number>();
    for (const row of rows) {
        const current = result.get(row.training_run_id);
        if (current === undefined || row.level_order > current) {
            result.set(row.training_run_id, row.level_order);
        }
    }
    return result;
}
