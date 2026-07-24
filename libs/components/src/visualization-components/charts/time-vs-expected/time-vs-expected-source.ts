import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable } from 'rxjs';
import { EventCacheDb, levelCompletedTable, levelStartedTable } from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import { createQuerySource, QuerySource } from '../shared';

/** Raw level-started row: which run/trainee started which level, and when. */
export interface StartedRow {
    readonly training_run_id: number;
    readonly user_ref_id: number;
    readonly level_order: number;
    readonly timestamp: number;
}

/** Raw level-completed row: which run completed which level, and when. */
export interface CompletedRow {
    readonly training_run_id: number;
    readonly level_order: number;
    readonly timestamp: number;
}

/**
 * Container for the two sub-query results of one fetch, wrapped so it satisfies the
 * `TRow[]` contract of {@link createQuerySource}. Doubles as this source's view-model.
 */
export interface TimeVsExpectedAggregate {
    readonly startedRows: readonly StartedRow[];
    readonly completedRows: readonly CompletedRow[];
}

/** Empty aggregate used before any data has been received. */
export const EMPTY_TIME_VS_EXPECTED_DATA: TimeVsExpectedAggregate = {
    startedRows: [],
    completedRows: [],
};

/**
 * Issues two Drizzle queries scoped to the instance — level-started and level-completed —
 * and folds them into one {@link TimeVsExpectedAggregate}.
 *
 * @param db              The local event-cache database.
 * @param instanceIdValue The instance id to scope the queries to.
 * @returns Observable emitting a single-element array carrying the aggregate.
 */
function buildTimeVsExpectedQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<TimeVsExpectedAggregate[]> {
    const startedQuery$ = from(
        db
            .select({
                training_run_id: levelStartedTable.training_run_id,
                user_ref_id: levelStartedTable.user_ref_id,
                level_order: levelStartedTable.level_order,
                timestamp: levelStartedTable.timestamp,
            })
            .from(levelStartedTable)
            .where(eq(levelStartedTable.instance_id, instanceIdValue)) as Promise<StartedRow[]>,
    );

    const completedQuery$ = from(
        db
            .select({
                training_run_id: levelCompletedTable.training_run_id,
                level_order: levelCompletedTable.level_order,
                timestamp: levelCompletedTable.timestamp,
            })
            .from(levelCompletedTable)
            .where(eq(levelCompletedTable.instance_id, instanceIdValue)) as Promise<CompletedRow[]>,
    );

    return combineLatest([startedQuery$, completedQuery$]).pipe(
        map(([startedRows, completedRows]) => [{ startedRows, completedRows }]),
    );
}

/**
 * Creates a live-polling {@link QuerySource} carrying the raw level-started/level-completed
 * rows for the time-vs-expected chart. Polls on the dashboard cadence, participates in the
 * pause gate, and stops past the instance end so the level-timing read refreshes as runs progress.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId Reactive signal carrying the training instance id.
 * @returns Query source whose vm is the raw aggregate, or null before first fetch.
 */
export function createTimeVsExpectedSource(instanceId: Signal<number>): QuerySource<TimeVsExpectedAggregate> {
    return createQuerySource<TimeVsExpectedAggregate, TimeVsExpectedAggregate>({
        instanceId,
        eventTypes: [PlatformEventType.LEVEL_STARTED, PlatformEventType.LEVEL_COMPLETED],
        live: true,
        query: (db, ctx) => buildTimeVsExpectedQuery(db, ctx.instanceId),
        map: (rows) => rows[0] ?? EMPTY_TIME_VS_EXPECTED_DATA,
    });
}
