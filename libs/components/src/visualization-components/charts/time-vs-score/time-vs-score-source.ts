import { computed, Signal } from '@angular/core';
import { and, eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of } from 'rxjs';
import {
    EventCacheDb,
    levelCompletedTable,
    levelStartedTable,
    trainingRunStartedTable,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';

import { createQuerySource, QuerySource } from '../shared';

/** Time spent on a level and the score earned for completing it. */
export interface LevelTimeScore {
    /**
     * Milliseconds from the level's first start to its final completion, or null when no
     * start row pairs with the completion (duration cannot be measured).
     */
    readonly durationMs: number | null;
    /** Points scored on the level, from the latest completion's `actual_score_in_level`. */
    readonly scoreInLevel: number;
}

/**
 * Selected run's per-level time and score, plus a definition-wide level-type lookup.
 * `byOrder` holds one entry per completed level order; absent orders are levels the run
 * has not finished.
 */
export interface TimeVsScoreVm {
    /** User the run belongs to, resolved to a name only at CSV export time; null when unscoped. */
    readonly userId: number | null;
    /** Time and score per completed level order. */
    readonly byOrder: ReadonlyMap<number, LevelTimeScore>;
    /** Level type keyed by level order, sourced from level_started across the instance. */
    readonly typeByOrder: ReadonlyMap<number, string>;
}

/** One level_started row carrying the level's start time and type. */
interface StartedRow {
    readonly level_order: number;
    readonly timestamp: number;
    readonly level_type: string;
}

/** One level_completed row carrying the completion time and the level's own score. */
interface CompletedRow {
    readonly level_order: number;
    readonly timestamp: number;
    readonly actual_score_in_level: number;
}

/** The run's owning user, taken from its training_run_started row. */
interface IdentityRow {
    readonly user_ref_id: number;
}

/** Raw query output combined before mapping to the view model. */
interface TimeVsScoreAggregate {
    readonly startedRows: readonly StartedRow[];
    readonly completedRows: readonly CompletedRow[];
    readonly identityRows: readonly IdentityRow[];
}

const EMPTY_AGGREGATE: TimeVsScoreAggregate = {
    startedRows: [],
    completedRows: [],
    identityRows: [],
};

/**
 * Builds the combined query for one run: its level starts (time and type), its level
 * completions (time and per-level score), and the run's owning user.
 *
 * @param db          The typed event-cache database.
 * @param instanceId  Instance the run belongs to.
 * @param runId       Selected training run id; non-positive when no run is selected.
 * @returns Observable emitting a single-element aggregate array.
 */
function buildTimeVsScoreQuery(
    db: EventCacheDb,
    instanceId: number,
    runId: number,
): Observable<TimeVsScoreAggregate[]> {
    if (runId <= 0) {
        return of([EMPTY_AGGREGATE]);
    }

    const startedRows$ = from(
        db
            .select({
                level_order: levelStartedTable.level_order,
                timestamp: levelStartedTable.timestamp,
                level_type: levelStartedTable.level_type,
            })
            .from(levelStartedTable)
            .where(
                and(
                    eq(levelStartedTable.instance_id, instanceId),
                    eq(levelStartedTable.training_run_id, runId),
                ),
            ) as Promise<StartedRow[]>,
    );

    const completedRows$ = from(
        db
            .select({
                level_order: levelCompletedTable.level_order,
                timestamp: levelCompletedTable.timestamp,
                actual_score_in_level: levelCompletedTable.actual_score_in_level,
            })
            .from(levelCompletedTable)
            .where(
                and(
                    eq(levelCompletedTable.instance_id, instanceId),
                    eq(levelCompletedTable.training_run_id, runId),
                ),
            ) as Promise<CompletedRow[]>,
    );

    const identityRows$ = from(
        db
            .select({ user_ref_id: trainingRunStartedTable.user_ref_id })
            .from(trainingRunStartedTable)
            .where(
                and(
                    eq(trainingRunStartedTable.instance_id, instanceId),
                    eq(trainingRunStartedTable.training_run_id, runId),
                ),
            ) as Promise<IdentityRow[]>,
    );

    return combineLatest([startedRows$, completedRows$, identityRows$]).pipe(
        map(([startedRows, completedRows, identityRows]) => [
            { startedRows, completedRows, identityRows },
        ]),
    );
}

/**
 * Reduces the raw aggregate to the view model. Per level order it pairs the earliest
 * start with the latest completion to measure duration, takes the latest completion's
 * own score, and records the first-seen level type.
 *
 * @param aggregate  Combined query output for one run.
 * @returns The time-vs-score view model.
 */
function toTimeVsScoreVm(aggregate: TimeVsScoreAggregate): TimeVsScoreVm {
    const typeByOrder = new Map<number, string>();
    const earliestStartByOrder = new Map<number, number>();
    for (const row of aggregate.startedRows) {
        const earliest = earliestStartByOrder.get(row.level_order);
        if (earliest === undefined || row.timestamp < earliest) {
            earliestStartByOrder.set(row.level_order, row.timestamp);
        }
        if (!typeByOrder.has(row.level_order)) {
            typeByOrder.set(row.level_order, row.level_type);
        }
    }

    const latestCompletion = new Map<number, CompletedRow>();
    for (const row of aggregate.completedRows) {
        const latest = latestCompletion.get(row.level_order);
        if (latest === undefined || row.timestamp > latest.timestamp) {
            latestCompletion.set(row.level_order, row);
        }
    }

    const byOrder = new Map<number, LevelTimeScore>();
    for (const [order, completion] of latestCompletion) {
        const start = earliestStartByOrder.get(order);
        byOrder.set(order, {
            durationMs: start === undefined ? null : completion.timestamp - start,
            scoreInLevel: completion.actual_score_in_level,
        });
    }

    return {
        userId: aggregate.identityRows[0]?.user_ref_id ?? null,
        byOrder,
        typeByOrder,
    };
}

/**
 * Live source for one run's per-level time and score. Polls the run's level starts and
 * completions, joins the pause gate, and auto-stops past instance end.
 *
 * @param instanceId  Reactive instance id scoping the queries.
 * @param runId       Reactive selected run id, or null when no run is selected.
 * @returns A query source emitting the time-vs-score view model.
 */
export function createTimeVsScoreSource(
    instanceId: Signal<number>,
    runId: Signal<number | null>,
): QuerySource<TimeVsScoreVm> {
    const runIdParam = computed(() => runId() ?? 0);
    return createQuerySource<TimeVsScoreAggregate, TimeVsScoreVm, number>({
        instanceId,
        param: runIdParam,
        eventTypes: [
            PlatformEventType.LEVEL_STARTED,
            PlatformEventType.LEVEL_COMPLETED,
            PlatformEventType.TRAINING_RUN_STARTED,
        ],
        live: true,
        query: (db, ctx) => buildTimeVsScoreQuery(db, ctx.instanceId, ctx.param),
        map: (rows) => toTimeVsScoreVm(rows[0] ?? EMPTY_AGGREGATE),
        isEmpty: (vm) => vm.userId === null,
    });
}
