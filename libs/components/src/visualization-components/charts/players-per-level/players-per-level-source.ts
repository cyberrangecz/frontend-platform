import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable } from 'rxjs';
import {
    EntityResolverService,
    EventCacheDb,
    levelStartedTable,
    trainingRunEndedTable,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/training-model';
import { createQuerySource, QuerySource, resolveInstanceLevels } from '../shared';

/**
 * Raw query row returned from the level_started table: one row per level-started
 * event, carrying run id, user ref, level metadata, and when the level was started.
 */
export interface LevelStartedRow {
    readonly training_run_id: number;
    readonly user_ref_id: number;
    readonly sandbox_id: string;
    readonly level_order: number;
    readonly level_title: string;
    readonly timestamp: number;
}

/**
 * Raw query row returned from the training_run_ended table: one row per finished run.
 */
export interface EndedRunRow {
    readonly training_run_id: number;
}

/**
 * Container for the two sub-query results that make up one live polling cycle.
 * Wrapped in an array to satisfy the TRow[] contract of QuerySourceConfig.
 */
export interface PlayersPerLevelAggregateRow {
    readonly levelStartedRows: readonly LevelStartedRow[];
    readonly endedRunRows: readonly EndedRunRow[];
}

/**
 * Per-active-run detail record: the current level the trainee is on, and metadata
 * needed for both the chart aggregation and the CSV export.
 */
export interface ActiveRunLevel {
    readonly trainingRunId: number;
    readonly userRefId: number;
    /** Identifier of the sandbox the trainee is running in. */
    readonly sandboxId: string;
    /** 0-based level order matching the training definition. */
    readonly currentLevelOrder: number;
    readonly currentLevelTitle: string;
    /** Millisecond timestamp of when the trainee entered the current level. */
    readonly levelStartedAt: number;
}

/** One entry per level in the training definition, used to build the x-axis. */
export interface LevelAxisEntry {
    readonly order: number;
    readonly title: string;
}

/**
 * One bar in the "Players per level" distribution chart.
 * Represents a single level on the x-axis and how many active players are currently at it.
 */
export interface PlayersPerLevelRow {
    readonly order: number;
    readonly levelLabel: string;
    readonly playerCount: number;
}

/**
 * Full view-model for the "Players per level" chart.
 * Rows are ordered by level order and include all defined levels, even those with
 * zero active players.
 */
export interface PlayersPerLevelVm {
    readonly rows: readonly PlayersPerLevelRow[];
    readonly totalPlayers: number;
}

/**
 * Reduces a flat list of level-started rows to a per-active-run detail list.
 * Each run's current level is the one with the maximum level_order; ties are
 * broken by the latest timestamp. Runs present in endedRunIds are excluded entirely.
 *
 * @param levelRows    All level-started rows for the instance, one per event.
 * @param endedRunIds  Set of training_run_ids that have a training_run_ended row.
 * @returns            One ActiveRunLevel per active run, with its current level info.
 */
export function deriveActiveRunLevels(
    levelRows: readonly LevelStartedRow[],
    endedRunIds: ReadonlySet<number>,
): ActiveRunLevel[] {
    const bestRowByRunId = new Map<number, LevelStartedRow>();
    for (const row of levelRows) {
        if (endedRunIds.has(row.training_run_id)) continue;
        const current = bestRowByRunId.get(row.training_run_id);
        if (
            current === undefined ||
            row.level_order > current.level_order ||
            (row.level_order === current.level_order && row.timestamp > current.timestamp)
        ) {
            bestRowByRunId.set(row.training_run_id, row);
        }
    }
    return [...bestRowByRunId.values()].map((row) => ({
        trainingRunId: row.training_run_id,
        userRefId: row.user_ref_id,
        sandboxId: row.sandbox_id,
        currentLevelOrder: row.level_order,
        currentLevelTitle: row.level_title,
        levelStartedAt: row.timestamp,
    }));
}

/**
 * Aggregates the per-active-run detail list into a level_order → active player count map.
 * Each active run contributes exactly one count to the bin of its current level.
 *
 * @param runs  Per-active-run detail records from {@link deriveActiveRunLevels}.
 * @returns     Map from level_order to the number of active runs currently at that level.
 */
export function tallyByLevelOrder(runs: readonly ActiveRunLevel[]): ReadonlyMap<number, number> {
    const result = new Map<number, number>();
    for (const run of runs) {
        result.set(run.currentLevelOrder, (result.get(run.currentLevelOrder) ?? 0) + 1);
    }
    return result;
}

/**
 * Builds the final chart rows by joining the level axis from entity resolution with
 * the active player counts derived from the event cache. Every defined level appears,
 * even those with zero active players.
 *
 * @param axis            Ordered array of levels from the training definition.
 * @param countsByOrder   Map from level_order to the number of active players at that level.
 * @returns               One {@link PlayersPerLevelRow} per axis entry, in axis order.
 */
export function buildPlayersPerLevelRows(
    axis: readonly LevelAxisEntry[],
    countsByOrder: ReadonlyMap<number, number>,
): PlayersPerLevelRow[] {
    return axis.map((entry) => ({
        order: entry.order,
        levelLabel: entry.title,
        playerCount: countsByOrder.get(entry.order) ?? 0,
    }));
}

/**
 * Issues two Drizzle queries against the local event cache scoped to the given
 * instance and combines them into a single {@link PlayersPerLevelAggregateRow}.
 *
 * Query 1: all level-started rows (run id, user ref id, level order, title, timestamp).
 * Query 2: all ended run ids for the instance.
 *
 * @param db               The local event-cache database.
 * @param instanceIdValue  The instance ID to scope the queries to.
 */
function buildPlayersPerLevelQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<PlayersPerLevelAggregateRow[]> {
    const levelStartedQuery$ = from(
        db
            .select({
                training_run_id: levelStartedTable.training_run_id,
                user_ref_id: levelStartedTable.user_ref_id,
                sandbox_id: levelStartedTable.sandbox_id,
                level_order: levelStartedTable.level_order,
                level_title: levelStartedTable.level_title,
                timestamp: levelStartedTable.timestamp,
            })
            .from(levelStartedTable)
            .where(eq(levelStartedTable.instance_id, instanceIdValue)) as Promise<LevelStartedRow[]>,
    );

    const endedRunQuery$ = from(
        db
            .select({
                training_run_id: trainingRunEndedTable.training_run_id,
            })
            .from(trainingRunEndedTable)
            .where(eq(trainingRunEndedTable.instance_id, instanceIdValue)) as Promise<EndedRunRow[]>,
    );

    return combineLatest([levelStartedQuery$, endedRunQuery$]).pipe(
        map(([levelStartedRows, endedRunRows]) => [{ levelStartedRows, endedRunRows }]),
    );
}

/**
 * Transforms the raw combined query rows into the structured active-run detail list.
 *
 * @param rows  Array with exactly one element — the combined level-started and ended-run data.
 * @returns     One ActiveRunLevel per active run, each placed at its current level.
 */
function mapPlayersPerLevelRows(rows: readonly PlayersPerLevelAggregateRow[]): readonly ActiveRunLevel[] {
    const combined = rows[0];
    if (!combined) return [];
    const endedRunIds = new Set<number>(combined.endedRunRows.map((row) => row.training_run_id));
    return deriveActiveRunLevels(combined.levelStartedRows, endedRunIds);
}

/**
 * Creates a live-polling {@link QuerySource} emitting one {@link ActiveRunLevel} per
 * active training run. Finished runs (those with a training_run_ended row) are excluded.
 * Each active run is placed at its current level (max level_order started, latest
 * timestamp on ties).
 *
 * Polls on the dashboard cadence, participates in the pause gate, and stops once the
 * instance end-time has passed.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId  Reactive signal carrying the training instance ID.
 * @returns           Query source whose vm emits the active-run detail list, or null
 *                    while no data has been received yet.
 */
export function createPlayersPerLevelLiveSource(
    instanceId: Signal<number>,
): QuerySource<readonly ActiveRunLevel[]> {
    return createQuerySource<PlayersPerLevelAggregateRow, readonly ActiveRunLevel[]>({
        instanceId,
        eventTypes: [PlatformEventType.LEVEL_STARTED, PlatformEventType.TRAINING_RUN_ENDED],
        live: true,
        query: (db, ctx) => buildPlayersPerLevelQuery(db, ctx.instanceId),
        map: (rows) => mapPlayersPerLevelRows(rows),
        isEmpty: (runs) => runs.length === 0,
    });
}

/**
 * Adapts {@link resolveInstanceLevels} to the chart's level-axis shape by projecting
 * each resolved level to `{ order, title }`. Resolution and reactivity semantics are
 * delegated entirely to {@link resolveInstanceLevels}.
 *
 * Passes through `null` when the instance is unavailable, and yields an empty array
 * when the definition has no levels.
 *
 * @param instanceId  Reactive signal carrying the training instance ID.
 * @param resolver    The entity resolver service forwarded to {@link resolveInstanceLevels}.
 * @returns           Observable emitting the ordered level axis entries, or `null` when
 *                    the instance cannot be resolved.
 */
export function buildLevelAxisStream(
    instanceId: Signal<number>,
    resolver: EntityResolverService,
): Observable<readonly LevelAxisEntry[] | null> {
    return resolveInstanceLevels(instanceId, resolver).pipe(
        map((resolved) => {
            if (resolved === null) return null;
            return resolved.levels.map((level): LevelAxisEntry => ({ order: level.order, title: level.title }));
        }),
    );
}
