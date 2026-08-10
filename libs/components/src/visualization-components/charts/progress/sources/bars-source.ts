import { inject, Signal } from '@angular/core';
import { and, eq } from 'drizzle-orm';
import { from, Observable } from 'rxjs';
import {
    EntityResolverService,
    EntityType,
    EventCacheDb,
    levelCompletedTable,
    levelStartedTable,
    ResolveEntitiesSafe,
    trainingRunEndedTable,
} from '@crczp/event-query-engine';
import {
    AbstractLevelTypeEnum,
    TrainingUser,
    PlatformEventType
} from '@crczp/training-model';

import { createQuerySource, QuerySource } from '../../shared';
import { BarRow } from '../types/bar.types';
import { asBarKey, asLevelId, asTrainingRunId, InstanceId } from '../types/ids.types';

/**
 * Broker event types the bars source declares interest in.
 *
 * The broker syncs these tables on the polling cadence. The bars cache query
 * left-joins them via the natural composite of training-run plus level so
 * each emitted row carries the three timestamp fields needed to resolve the
 * bar's effective right edge.
 */
export const BARS_EVENT_TYPES: readonly PlatformEventType[] = [
    PlatformEventType.LEVEL_STARTED,
    PlatformEventType.LEVEL_COMPLETED,
    PlatformEventType.TRAINING_RUN_ENDED,
] as const;

/**
 * Row shape projected by the broker cache query. Carries the resolver-owned
 * `user_ref_id` field so the entity resolver can replace it with a
 * `TrainingUser` (or the `{ userId }` tolerant fallback) before the row is
 * normalized into a `BarRow`.
 */
interface BarQueryRow {
    readonly training_run_id: number;
    readonly level_id: number;
    readonly level_order: number;
    readonly level_type: string;
    readonly level_title: string;
    readonly user_ref_id: number;
    readonly started_at: number;
    readonly completed_at: number | null;
    readonly score_on_completion: number | null;
    readonly run_ended_at: number | null;
}

/** Bar query row after the entity resolver substitutes its `user_ref_id`. */
type ResolvedBarRow = ResolveEntitiesSafe<BarQueryRow, readonly [EntityType.User]>;

/**
 * Builds the Drizzle query that returns one row per `(training_run_id, level_id)`
 * pair for the supplied instance. The driver table is `level_started`. Both
 * the completion event and the run-end event are LEFT-joined so the projection
 * yields `null` for the corresponding timestamps when those events have not
 * yet been observed.
 *
 * @param db          The typed event-cache database.
 * @param instanceId  Instance whose bars are queried.
 * @returns Observable emitting the raw bar rows for the instance.
 */
function buildBarsQuery(db: EventCacheDb, instanceId: number): Observable<BarQueryRow[]> {
    return from(
        db
            .select({
                training_run_id: levelStartedTable.training_run_id,
                level_id: levelStartedTable.level_id,
                level_order: levelStartedTable.level_order,
                level_type: levelStartedTable.level_type,
                level_title: levelStartedTable.level_title,
                user_ref_id: levelStartedTable.user_ref_id,
                started_at: levelStartedTable.timestamp,
                completed_at: levelCompletedTable.timestamp,
                score_on_completion: levelCompletedTable.actual_score_in_level,
                run_ended_at: trainingRunEndedTable.timestamp,
            })
            .from(levelStartedTable)
            .leftJoin(
                levelCompletedTable,
                and(
                    eq(levelCompletedTable.training_run_id, levelStartedTable.training_run_id),
                    eq(levelCompletedTable.level_id, levelStartedTable.level_id),
                ),
            )
            .leftJoin(
                trainingRunEndedTable,
                eq(trainingRunEndedTable.training_run_id, levelStartedTable.training_run_id),
            )
            .where(eq(levelStartedTable.instance_id, instanceId)) as Promise<BarQueryRow[]>,
    );
}

/**
 * Replaces the resolver's `{ userId }` tolerant-fallback shape with a fully
 * populated synthetic `TrainingUser`. Downstream selectors and view-model
 * assemblers read `bar.user.id` and `bar.user.name` unconditionally, so the
 * source guarantees a complete shape on every row.
 *
 * @param resolvedUser  The resolver output, either a full `TrainingUser` or the
 *                      `{ userId }` tolerant fallback.
 * @returns A fully populated `TrainingUser`.
 */
function normalizeUser(resolvedUser: TrainingUser | { userId: number }): TrainingUser {
    if ('name' in resolvedUser) {
        return resolvedUser;
    }
    const synthetic = new TrainingUser();
    synthetic.id = resolvedUser.userId;
    synthetic.name = `User #${resolvedUser.userId}`;
    synthetic.login = `user-${resolvedUser.userId}`;
    synthetic.picture = '';
    synthetic.mail = '';
    return synthetic;
}

/**
 * Maps a resolved query row into the canonical `BarRow` shape consumed by the
 * selector layer. The `key` field is built deterministically from the
 * `(trainingRunId, levelId)` composite via {@link asBarKey} so downstream Map
 * lookups (e.g. `group-events`) remain collision-free.
 *
 * @param row  One resolved bar query row.
 * @returns The normalized bar row.
 */
function toBarRow(row: ResolvedBarRow): BarRow {
    const trainingRunId = asTrainingRunId(row.training_run_id);
    const levelId = asLevelId(row.level_id);
    return {
        key: asBarKey(trainingRunId, levelId),
        trainingRunId,
        levelId,
        levelOrder: row.level_order,
        levelType: row.level_type as AbstractLevelTypeEnum,
        levelTitle: row.level_title,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        runEndedAt: row.run_ended_at,
        scoreOnCompletion: row.score_on_completion,
        user: normalizeUser(row.user),
    };
}

/**
 * Live source of the instance's bar rows. Polls the level-started driver
 * left-joined to completions and run-ends, resolves each row's `user_ref_id`
 * to a `TrainingUser`, and projects to `BarRow`. Obeys the dashboard pause
 * gate and stops once the instance end-time has passed.
 *
 * Must be called inside an injection context.
 *
 * @param instanceId  Reactive instance id scoping the query.
 * @returns A query source emitting the instance's bar rows.
 */
export function createBarsSource(instanceId: Signal<InstanceId>): QuerySource<readonly BarRow[]> {
    const resolver = inject(EntityResolverService);
    return createQuerySource<ResolvedBarRow, readonly BarRow[]>({
        instanceId,
        eventTypes: [...BARS_EVENT_TYPES],
        live: true,
        query: (db, ctx) =>
            buildBarsQuery(db, ctx.instanceId).pipe(
                resolver.resolveSafe<BarQueryRow, readonly [EntityType.User]>([EntityType.User]),
            ),
        map: (rows) => rows.map(toBarRow),
    });
}
