import { and, eq, inArray } from 'drizzle-orm';
import { EventCacheDb, WatermarkEntry } from '../../cache.interface';
import { watermarkTable } from '../schema/schema';

/**
 * Returns the watermark entries for the given instance and event types.
 *
 * @param db Event-cache database handle.
 * @param instanceId Instance whose watermarks are read.
 * @param eventTypes Event types to look up; an empty list yields no rows.
 * @returns Watermark entries for the matching (instance, type) pairs.
 */
export async function getWatermarks(
    db: EventCacheDb,
    instanceId: number,
    eventTypes: string[],
): Promise<WatermarkEntry[]> {
    if (eventTypes.length === 0) return [];

    const rows = await db
        .select()
        .from(watermarkTable)
        .where(and(eq(watermarkTable.instance_id, instanceId), inArray(watermarkTable.event_type, eventTypes)));

    return rows.map((row) => ({
        instanceId: row.instance_id,
        eventType: row.event_type,
        maxTimestamp: row.max_timestamp,
        lastSynced: row.last_synced,
    }));
}
