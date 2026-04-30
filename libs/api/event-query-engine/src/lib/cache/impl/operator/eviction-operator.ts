import { PgliteDatabase } from 'drizzle-orm/pglite';
import { eq, max } from 'drizzle-orm';
import { PortalConfig } from '@crczp/utils';
import { eventTables, watermarkTable } from '../schema/schema';

export async function evictStaleInstances(
    db: PgliteDatabase,
    config: PortalConfig,
    activeInstanceId?: number,
): Promise<void> {
    const ttlBoundary = Date.now() - config.caching.eventCacheTTL * 1000;

    await db.transaction(async (tx) => {
        const watermarks = await tx
            .select({ instanceId: watermarkTable.instance_id, lastSynced: max(watermarkTable.last_synced) })
            .from(watermarkTable)
            .groupBy(watermarkTable.instance_id);

        const stale = watermarks
            .filter((w) => w.lastSynced !== null && w.lastSynced < ttlBoundary && w.instanceId !== activeInstanceId)
            .sort((a, b) => (a.lastSynced ?? 0) - (b.lastSynced ?? 0));

        for (const { instanceId } of stale) {
            await tx.delete(watermarkTable).where(eq(watermarkTable.instance_id, instanceId));
            for (const table of Object.values(eventTables)) {
                await tx.delete(table as any).where(eq((table as any).instance_id, instanceId));
            }
        }
    });
}
