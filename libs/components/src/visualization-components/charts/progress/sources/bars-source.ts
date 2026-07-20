import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { and, eq } from 'drizzle-orm';
import { filter, from, map, Observable, takeUntil } from 'rxjs';
import {
    DataBrokerService,
    EntityResolverService,
    EntityType,
    EventCacheDb,
    levelCompletedTable,
    levelStartedTable,
    ResolveEntitiesSafe,
    trainingRunEndedTable,
} from '@crczp/event-query-engine';
import { AbstractLevelTypeEnum, TrainingUser } from '@crczp/training-model';
import { PlatformEventType } from '@crczp/visualization-model';
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
 * Dependencies for the bars source factory.
 *
 *  - `instanceId`: reactive scope. On change the inner stream is torn down
 *    and a new sync cycle begins.
 *  - `broker`: orchestrates sync + cache query. See `@crczp/event-query-engine`.
 *  - `resolver`: post-pipe operator that resolves `user_ref_id` columns into
 *    `TrainingUser` entities via the entity registry.
 *  - `liveness$`: emits `false` when the instance is past-ended; the inner
 *    observable is gated via `takeUntil` so polling stops cleanly.
 */
export interface BarsSourceDeps {
    readonly instanceId: Signal<InstanceId>;
    readonly broker: DataBrokerService;
    readonly resolver: EntityResolverService;
    readonly liveness$: Observable<boolean>;
}

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

/**
 * Minimal structural type covering only the Drizzle chainable surface this
 * query uses. The cache module deliberately keeps the underlying Drizzle
 * database opaque behind {@link EventCacheDb}; the integration spec uses an
 * `as any` cast for the same reason. Declaring the chain locally keeps the
 * cast typed without leaking `drizzle-orm/pglite` types into the components
 * library.
 */
interface DrizzleSelectChain {
    select(projection: Record<string, unknown>): {
        from(table: unknown): {
            leftJoin(
                table: unknown,
                on: unknown,
            ): {
                leftJoin(
                    table: unknown,
                    on: unknown,
                ): {
                    where(condition: unknown): Promise<BarQueryRow[]>;
                };
            };
        };
    };
}

/**
 * Builds the Drizzle query that returns one row per `(training_run_id, level_id)`
 * pair for the supplied instance. The driver table is `level_started`. Both
 * the completion event and the run-end event are LEFT-joined so the projection
 * yields `null` for the corresponding timestamps when those events have not
 * yet been observed.
 */
function buildBarsQuery(
    instanceIdValue: number,
): (db: EventCacheDb) => Observable<BarQueryRow[]> {
    return (db) => {
        const drizzleDb = db as unknown as DrizzleSelectChain;

        const query = drizzleDb
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
            .where(eq(levelStartedTable.instance_id, instanceIdValue));

        return from(query as Promise<BarQueryRow[]>);
    };
}

/**
 * Replaces the resolver's `{ userId }` tolerant-fallback shape with a fully
 * populated synthetic `TrainingUser`. Downstream selectors and view-model
 * assemblers read `bar.user.id` and `bar.user.name` unconditionally, so the
 * source guarantees a complete shape on every row.
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
 * Maps the resolver's output rows into the canonical `BarRow` shape consumed
 * by the selector layer. The `key` field is built deterministically from the
 * `(trainingRunId, levelId)` composite via {@link asBarKey} so downstream Map
 * lookups (e.g. `group-events`) remain collision-free.
 */
function toBarRow(row: ResolveEntitiesSafe<BarQueryRow, readonly [EntityType.User]>): BarRow {
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
 * Builds the bars reactive accessor.
 *
 * Wires `broker.queryPolling(BARS_EVENT_TYPES, barsQueryFn)` through the
 * resolver pipe, gates with `takeUntil(liveness$.pipe(filter(live => !live)))`,
 * and bridges into a signal at the boundary via `toSignal`.
 *
 * The returned signal emits an empty array until the first poll cycle
 * completes and stays referentially stable when consecutive cycles return
 * structurally identical rows.
 */
export function createBarsSource(deps: BarsSourceDeps): Signal<readonly BarRow[]> {
    const { instanceId, broker, resolver, liveness$ } = deps;

    const queryFn = (db: EventCacheDb): Observable<BarQueryRow[]> =>
        buildBarsQuery(instanceId())(db);

    const stream: Observable<readonly BarRow[]> = broker
        .queryPolling<BarQueryRow>(instanceId, [...BARS_EVENT_TYPES], queryFn)
        .pipe(
            resolver.resolveSafe<BarQueryRow, readonly [EntityType.User]>([EntityType.User]),
            map((rows) => rows.map((row) => toBarRow(row))),
            takeUntil(liveness$.pipe(filter((live) => !live))),
        );

    return toSignal(stream, { initialValue: [] as readonly BarRow[] });
}
