import { PgliteDatabase } from 'drizzle-orm/pglite';
import { asc, eq, max, sql } from 'drizzle-orm';
import { PortalConfig } from '@crczp/utils';
import { eventTables, watermarkTable } from '../schema/schema';

/**
 * Runs TTL eviction followed by size-based LRU eviction.
 * Called once at bootstrap, before any instance is active.
 *
 * @param db - Drizzle PGlite database handle.
 * @param config - Portal configuration carrying TTL and max-size limits.
 */
export async function evictStaleInstances(
    db: PgliteDatabase,
    config: PortalConfig,
): Promise<void> {
    await evictByTtl(db, config);
    await evictBySize(db, config);
}

/**
 * Deletes all data for instances whose most-recent sync timestamp is older than the configured TTL.
 *
 * @param db - Drizzle PGlite database handle.
 * @param config - Portal configuration carrying the TTL value.
 */
async function evictByTtl(
    db: PgliteDatabase,
    config: PortalConfig,
): Promise<void> {
    const ttlBoundary = Date.now() - config.caching.eventCacheTTL * 1000;

    await db.transaction(async (tx) => {
        const watermarks = await tx
            .select({ instanceId: watermarkTable.instance_id, lastSynced: max(watermarkTable.last_synced) })
            .from(watermarkTable)
            .groupBy(watermarkTable.instance_id);

        const stale = watermarks
            .filter((w) => w.lastSynced !== null && Number(w.lastSynced) < ttlBoundary)
            .sort((a, b) => Number(a.lastSynced ?? 0) - Number(b.lastSynced ?? 0));

        for (const { instanceId } of stale) {
            await dropInstance(tx, instanceId);
        }
    });
}

/**
 * Enforces the configured max cache size by dropping the least-recently-synced instances
 * one at a time until the database fits within the limit.
 *
 * Runs VACUUM after each drop so that {@link pg_database_size} reflects reclaimed space.
 * Logs a warning to the console when the limit is first breached.
 *
 * @param db - Drizzle PGlite database handle.
 * @param config - Portal configuration carrying the max-size limit.
 */
async function evictBySize(
    db: PgliteDatabase,
    config: PortalConfig,
): Promise<void> {
    const maxSize = config.caching.eventCacheMaxSize;

    // Reclaim space freed by TTL eviction before measuring.
    await db.execute(sql.raw('VACUUM FULL'));

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

    for (let i = 0; i < candidates.length; i++) {
        if (currentSize <= maxSize) break;

        // Never drop the last remaining instance — always keep at least one.
        if (i === candidates.length - 1) break;

        await db.transaction(async (tx) => dropInstance(tx, candidates[i].instanceId));
        await db.execute(sql.raw('VACUUM FULL'));
        currentSize = await queryDbSize(db);
    }
}

/**
 * Deletes all watermark entries and event rows for the given instance inside the provided
 * transaction context.
 *
 * @param tx - Active Drizzle transaction.
 * @param instanceId - ID of the instance whose data is to be removed.
 */
async function dropInstance(tx: PgliteDatabase, instanceId: number): Promise<void> {
    await tx.delete(watermarkTable).where(eq(watermarkTable.instance_id, instanceId));
    for (const table of Object.values(eventTables)) {
        await tx.delete(table as any).where(eq((table as any).instance_id, instanceId));
    }
}

/**
 * Returns the current total size of the PGlite database in bytes.
 *
 * @param db - Drizzle PGlite database handle.
 * @returns Size in bytes as reported by {@link pg_database_size}.
 */
async function queryDbSize(db: PgliteDatabase): Promise<number> {
    const result = await db.execute(sql`SELECT pg_database_size(current_database()) AS size`);
    return Number((result.rows[0] as Record<string, unknown>).size);
}

/**
 * Formats a byte count into a human-readable string (B / KB / MB / GB).
 *
 * @param bytes - Raw byte count.
 * @returns Human-readable size string.
 */
function formatBytes(bytes: number): string {
    if (bytes < 1_024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
    if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}
