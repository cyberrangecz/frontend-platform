import { eq } from 'drizzle-orm';
import { eventTables, watermarkTable } from '../schema/schema';
import { EventCacheDb } from '../../cache.interface';

/**
 * Deletes all watermark entries and event rows scoped to the given instance, atomically.
 *
 * @param db Event-cache database handle.
 * @param instanceId Instance whose data is removed.
 */
export async function purge(db: EventCacheDb, instanceId: number): Promise<void> {
    const statements: unknown[] = [
        db.delete(watermarkTable).where(eq(watermarkTable.instance_id, instanceId)),
    ];
    for (const table of Object.values(eventTables)) {
        statements.push(db.delete(table as any).where(eq((table as any).instance_id, instanceId)));
    }
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
}
