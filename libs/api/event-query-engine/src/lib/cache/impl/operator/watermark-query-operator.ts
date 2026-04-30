import { PgliteDatabase } from 'drizzle-orm/pglite';
import { and, eq, inArray } from 'drizzle-orm';
import { WatermarkEntry } from '../../cache.interface';
import { watermarkTable } from '../schema/schema';

export async function getWatermarks(
    db: PgliteDatabase,
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
