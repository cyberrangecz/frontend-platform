import { asc, eq, max, sql, SQL } from 'drizzle-orm';
import { PortalConfig } from '@crczp/utils';
import { eventTables, watermarkTable } from '../schema/schema';
import { EventCacheDb } from '../../cache.interface';

/**
 * Runs TTL eviction followed by size-based LRU eviction.
 * Called once at bootstrap, before any instance is active.
 *
 * @param db Event-cache database handle.
 * @param config Portal configuration carrying TTL and max-size limits.
 */
export async function evictStaleInstances(
    db: EventCacheDb,
    config: PortalConfig,
): Promise<void> {
    await evictByTtl(db, config);
    await evictBySize(db, config);
}

/**
 * Deletes all data for instances whose most-recent sync timestamp is older than the configured TTL.
 *
 * @param db Event-cache database handle.
 * @param config Portal configuration carrying the TTL value.
 */
async function evictByTtl(
    db: EventCacheDb,
    config: PortalConfig,
): Promise<void> {
    const ttlBoundary = Date.now() - config.caching.eventCacheTtlMs;

    const watermarks = await db
        .select({ instanceId: watermarkTable.instance_id, lastSynced: max(watermarkTable.last_synced) })
        .from(watermarkTable)
        .groupBy(watermarkTable.instance_id);

    const stale = watermarks
        .filter((entry) => entry.lastSynced !== null && Number(entry.lastSynced) < ttlBoundary)
        .sort((a, b) => Number(a.lastSynced ?? 0) - Number(b.lastSynced ?? 0));

    for (const { instanceId } of stale) {
        await db.batch(dropInstanceStatements(db, instanceId));
    }
}

/**
 * Enforces the configured max cache size by dropping the least-recently-synced instances one at a
 * time until the database fits within the limit. Reclaims space with `VACUUM` before each
 * measurement, and never drops the last remaining instance.
 *
 * @param db Event-cache database handle.
 * @param config Portal configuration carrying the max-size limit.
 */
async function evictBySize(
    db: EventCacheDb,
    config: PortalConfig,
): Promise<void> {
    const maxSize = config.caching.eventCacheMaxSizeBytes;

    // Reclaim space freed by TTL eviction before measuring the high-water mark.
    await db.run(sql`VACUUM`);

    let currentSize = await queryDbSize(db);

    if (currentSize <= maxSize) {
        return;
    }

    console.warn(
        `[EventCache] Database size ${formatBytes(currentSize)} exceeds limit ${formatBytes(maxSize)}. Evicting oldest instances.`,
    );

    const candidates = await db
        .select({ instanceId: watermarkTable.instance_id, lastSynced: max(watermarkTable.last_synced) })
        .from(watermarkTable)
        .groupBy(watermarkTable.instance_id)
        .orderBy(asc(max(watermarkTable.last_synced)));

    for (let index = 0; index < candidates.length; index++) {
        if (currentSize <= maxSize) break;

        // Never drop the last remaining instance — always keep at least one.
        if (index === candidates.length - 1) break;

        await db.batch(dropInstanceStatements(db, candidates[index].instanceId));
        await db.run(sql`VACUUM`);
        currentSize = await queryDbSize(db);
    }
}

/**
 * Builds the delete statements removing all watermark and event rows for one instance, suitable for
 * an atomic batch.
 *
 * @param db Event-cache database handle.
 * @param instanceId Instance whose data is removed.
 * @returns Delete statements covering the watermark table and every event table.
 */
function dropInstanceStatements(db: EventCacheDb, instanceId: number): Parameters<EventCacheDb['batch']>[0] {
    const statements: unknown[] = [
        db.delete(watermarkTable).where(eq(watermarkTable.instance_id, instanceId)),
    ];
    for (const table of Object.values(eventTables)) {
        statements.push(db.delete(table as any).where(eq((table as any).instance_id, instanceId)));
    }
    return statements as unknown as Parameters<EventCacheDb['batch']>[0];
}

/**
 * Returns the current database size in bytes (`page_count` × `page_size`).
 *
 * @param db Event-cache database handle.
 * @returns Size in bytes.
 */
async function queryDbSize(db: EventCacheDb): Promise<number> {
    const pageCount = await readPragmaNumber(db, sql`PRAGMA page_count`);
    const pageSize = await readPragmaNumber(db, sql`PRAGMA page_size`);
    return pageCount * pageSize;
}

/**
 * Reads a single numeric value from a PRAGMA query.
 *
 * @param db Event-cache database handle.
 * @param query PRAGMA statement returning one numeric column.
 * @returns The numeric value, or 0 when absent.
 */
async function readPragmaNumber(db: EventCacheDb, query: SQL): Promise<number> {
    const rows = (await db.all(query)) as unknown[];
    const firstRow = rows[0] as unknown[] | undefined;
    return firstRow ? Number(firstRow[0]) : 0;
}

/**
 * Formats a byte count into a human-readable string (B / KB / MB / GB).
 *
 * @param bytes Raw byte count.
 * @returns Human-readable size string.
 */
function formatBytes(bytes: number): string {
    if (bytes < 1_024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
    if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}
