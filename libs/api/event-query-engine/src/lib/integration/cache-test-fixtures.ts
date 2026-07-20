import { sql } from 'drizzle-orm';
import { PortalConfig } from '@crczp/utils';
import { EventCacheDb, RawEventRow } from '../cache/cache.interface';

/** Routing key whose rows land in the `level_started` table. */
export const LEVEL_STARTED_TYPE = 'LevelStarted';
/** Routing key whose rows land in the `command` table. */
export const COMMAND_TYPE = 'Command';

let counter = 0;

/**
 * Produces a process-unique identifier so distinct rows never collide on the
 * primary key unless a test intentionally reuses an id.
 *
 * @returns A unique id string.
 */
export function uniqueId(): string {
    counter += 1;
    return `id-${counter}`;
}

/**
 * Builds a complete, valid `level_started` row with every non-null column
 * populated, allowing field-level overrides.
 *
 * @param overrides Fields to override on the base row.
 * @returns A complete level_started event row.
 */
export function makeLevelStartedRow(overrides: Partial<RawEventRow> = {}): RawEventRow {
    return {
        id: uniqueId(),
        type: LEVEL_STARTED_TYPE,
        timestamp: 1_000,
        instance_id: 1,
        sandbox_id: 'sandbox-a',
        pool_id: 10,
        training_definition_id: 20,
        training_instance_id: 30,
        training_run_id: 40,
        level_id: 50,
        user_ref_id: 60,
        training_time: 12.5,
        level_order: 1,
        actual_score_in_level: 5,
        total_training_level_score: 10,
        total_assessment_level_score: 15,
        level_type: 'TRAINING',
        level_title: 'Level One',
        max_score: 100,
        ...overrides,
    };
}

/**
 * Builds a `command` row with all non-null columns populated. Nullable columns
 * (training_time, command_arguments, hostname, username, wd, ip) are omitted by
 * default and can be supplied via overrides.
 *
 * @param overrides Fields to override on the base row.
 * @returns A command event row.
 */
export function makeCommandRow(overrides: Partial<RawEventRow> = {}): RawEventRow {
    return {
        id: uniqueId(),
        type: COMMAND_TYPE,
        timestamp: 1_000,
        instance_id: 1,
        sandbox_id: 'sandbox-a',
        cmd_type: 'BASH',
        command: 'ls',
        ...overrides,
    };
}

/**
 * Reads a single integer count from a one-column, one-row SELECT.
 *
 * @param db The cache database handle.
 * @param table The table name to count rows in.
 * @param instanceId The instance scope for the count.
 * @returns The row count for that instance.
 */
export async function countRows(
    db: EventCacheDb,
    table: string,
    instanceId: number,
): Promise<number> {
    const rows = await db.all(
        sql`SELECT count(*) FROM ${sql.identifier(table)} WHERE instance_id = ${instanceId}`,
    );
    return Number((rows[0] as unknown[])[0]);
}

/**
 * Counts watermark rows scoped to an instance.
 *
 * @param db The cache database handle.
 * @param instanceId The instance scope.
 * @returns The number of watermark rows for that instance.
 */
export async function countWatermarks(db: EventCacheDb, instanceId: number): Promise<number> {
    const rows = await db.all(
        sql`SELECT count(*) FROM watermarks WHERE instance_id = ${instanceId}`,
    );
    return Number((rows[0] as unknown[])[0]);
}

/**
 * Seeds a watermark row directly with explicit timing so eviction TTL/size
 * boundaries are controlled precisely, independent of insert() time-stamping.
 *
 * @param db The cache database handle.
 * @param instanceId The instance scope.
 * @param eventType The event type for the watermark.
 * @param maxTimestamp The stored max event timestamp.
 * @param lastSynced The last-sync time in epoch ms.
 * @returns Resolves once the row is written.
 */
export async function seedWatermark(
    db: EventCacheDb,
    instanceId: number,
    eventType: string,
    maxTimestamp: number,
    lastSynced: number,
): Promise<void> {
    await db.run(
        sql`INSERT INTO watermarks (instance_id, event_type, max_timestamp, last_synced)
            VALUES (${instanceId}, ${eventType}, ${maxTimestamp}, ${lastSynced})`,
    );
}

/**
 * Seeds a single level_started event row directly via raw SQL with an explicit
 * timestamp, so size-based seeding does not depend on insert().
 *
 * @param db The cache database handle.
 * @param instanceId The instance scope.
 * @param id The primary-key id for the row.
 * @param timestamp The event timestamp.
 * @returns Resolves once the row is written.
 */
export async function seedLevelStartedRow(
    db: EventCacheDb,
    instanceId: number,
    id: string,
    timestamp: number,
): Promise<void> {
    await db.run(
        sql`INSERT INTO level_started (
                id, instance_id, timestamp, type, sandbox_id, pool_id,
                training_definition_id, training_instance_id, training_run_id,
                level_id, user_ref_id, training_time, level_order,
                actual_score_in_level, total_training_level_score,
                total_assessment_level_score, level_type, level_title, max_score
            ) VALUES (
                ${id}, ${instanceId}, ${timestamp}, ${LEVEL_STARTED_TYPE}, 'sandbox-a', 10,
                20, 30, 40, 50, 60, 12.5, 1, 5, 10, 15, 'TRAINING', 'Level', 100
            )`,
    );
}

/**
 * Builds an eviction config with the supplied TTL and size budget.
 *
 * @param eventCacheTtlMs Time-to-live in milliseconds.
 * @param eventCacheMaxSizeBytes Size budget in bytes.
 * @returns A config object shaped for evictStaleInstances.
 */
export function makeEvictionConfig(eventCacheTtlMs: number, eventCacheMaxSizeBytes: number): PortalConfig {
    return { caching: { eventCacheTtlMs, eventCacheMaxSizeBytes } } as unknown as PortalConfig;
}
