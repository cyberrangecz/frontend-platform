import { computed, Signal } from '@angular/core';
import { and, eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of } from 'rxjs';
import {
    EventCacheDb,
    levelCompletedTable,
    levelStartedTable,
    trainingRunStartedTable,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/training-model';

import { createQuerySource, QuerySource } from '../shared';

/** Cumulative score at the moment a level is cleared. */
export interface CompletedLevelScore {
    /**
     * Cumulative total score at the end of this level. The level_completed event carries
     * the running totals from BEFORE this level (they are accumulated only afterwards), so
     * this level's own `actual_score_in_level` is added back to reach the true end-of-level total.
     */
    readonly cumulativeScore: number;
}

/**
 * Selected run's per-level completion scores plus a definition-wide level-type lookup.
 * `completedByOrder` holds the latest-by-timestamp completion per level order; absent
 * orders are levels the run has not finished.
 */
export interface CumulativeScoreVm {
    /** User the run belongs to, resolved to a name only at CSV export time; null when unscoped. */
    readonly userId: number | null;
    /** Latest cumulative score pair per completed level order. */
    readonly completedByOrder: ReadonlyMap<number, CompletedLevelScore>;
    /** Level type keyed by level order, sourced from level_started across the instance. */
    readonly typeByOrder: ReadonlyMap<number, string>;
}

/** One level_completed row carrying the cumulative score at the moment of completion. */
interface CompletedRow {
    readonly level_order: number;
    readonly timestamp: number;
    readonly total_training_level_score: number;
    readonly total_assessment_level_score: number;
    readonly actual_score_in_level: number;
}

/** One distinct level order to level type pairing from level_started. */
interface LevelTypeRow {
    readonly level_order: number;
    readonly level_type: string;
}

/** The run's owning user, taken from its training_run_started row. */
interface IdentityRow {
    readonly user_ref_id: number;
}

/** Raw query output combined before mapping to the view model. */
interface CumulativeScoreAggregate {
    readonly completedRows: readonly CompletedRow[];
    readonly typeRows: readonly LevelTypeRow[];
    readonly identityRows: readonly IdentityRow[];
}

const EMPTY_AGGREGATE: CumulativeScoreAggregate = {
    completedRows: [],
    typeRows: [],
    identityRows: [],
};

/**
 * Builds the combined query for one run: its level completions (with cumulative score),
 * the instance-wide level order to type map, and the run's owning user.
 *
 * @param db          The typed event-cache database.
 * @param instanceId  Instance the run belongs to.
 * @param runId       Selected training run id; non-positive when no run is selected.
 * @returns Observable emitting a single-element aggregate array.
 */
function buildCumulativeScoreQuery(
    db: EventCacheDb,
    instanceId: number,
    runId: number,
): Observable<CumulativeScoreAggregate[]> {
    if (runId <= 0) {
        return of([EMPTY_AGGREGATE]);
    }

    const completedRows$ = from(
        db
            .select({
                level_order: levelCompletedTable.level_order,
                timestamp: levelCompletedTable.timestamp,
                total_training_level_score: levelCompletedTable.total_training_level_score,
                total_assessment_level_score: levelCompletedTable.total_assessment_level_score,
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

    const typeRows$ = from(
        db
            .select({
                level_order: levelStartedTable.level_order,
                level_type: levelStartedTable.level_type,
            })
            .from(levelStartedTable)
            .where(eq(levelStartedTable.instance_id, instanceId)) as Promise<LevelTypeRow[]>,
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

    return combineLatest([completedRows$, typeRows$, identityRows$]).pipe(
        map(([completedRows, typeRows, identityRows]) => [{ completedRows, typeRows, identityRows }]),
    );
}

/**
 * Reduces the raw aggregate to the view model, keeping the latest completion per level
 * order and the first-seen type per order.
 *
 * @param aggregate  Combined query output for one run.
 * @returns The cumulative score view model.
 */
function toCumulativeScoreVm(aggregate: CumulativeScoreAggregate): CumulativeScoreVm {
    const completedByOrder = new Map<number, CompletedLevelScore>();
    const latestTimestampByOrder = new Map<number, number>();
    for (const row of aggregate.completedRows) {
        const latest = latestTimestampByOrder.get(row.level_order);
        if (latest === undefined || row.timestamp > latest) {
            latestTimestampByOrder.set(row.level_order, row.timestamp);
            completedByOrder.set(row.level_order, {
                cumulativeScore:
                    row.total_training_level_score +
                    row.total_assessment_level_score +
                    row.actual_score_in_level,
            });
        }
    }

    const typeByOrder = new Map<number, string>();
    for (const row of aggregate.typeRows) {
        if (!typeByOrder.has(row.level_order)) {
            typeByOrder.set(row.level_order, row.level_type);
        }
    }

    return {
        userId: aggregate.identityRows[0]?.user_ref_id ?? null,
        completedByOrder,
        typeByOrder,
    };
}

/**
 * Live source for one run's cumulative score progression. Polls the run's level
 * completions, joins the pause gate, and auto-stops past instance end.
 *
 * @param instanceId  Reactive instance id scoping the queries.
 * @param runId       Reactive selected run id, or null when no run is selected.
 * @returns A query source emitting the cumulative score view model.
 */
export function createCumulativeScoreSource(
    instanceId: Signal<number>,
    runId: Signal<number | null>,
): QuerySource<CumulativeScoreVm> {
    const runIdParam = computed(() => runId() ?? 0);
    return createQuerySource<CumulativeScoreAggregate, CumulativeScoreVm, number>({
        instanceId,
        param: runIdParam,
        eventTypes: [
            PlatformEventType.LEVEL_STARTED,
            PlatformEventType.LEVEL_COMPLETED,
            PlatformEventType.TRAINING_RUN_STARTED,
        ],
        live: true,
        query: (db, ctx) => buildCumulativeScoreQuery(db, ctx.instanceId, ctx.param),
        map: (rows) => toCumulativeScoreVm(rows[0] ?? EMPTY_AGGREGATE),
        isEmpty: (vm) => vm.userId === null,
    });
}
