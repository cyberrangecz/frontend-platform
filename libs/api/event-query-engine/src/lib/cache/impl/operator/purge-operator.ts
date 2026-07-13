import { PgliteDatabase } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { eventTables, watermarkTable } from '../schema/schema';

export async function purge(db: PgliteDatabase, instanceId: number): Promise<void> {
    await db.transaction(async (tx) => {
        await tx.delete(watermarkTable).where(eq(watermarkTable.instance_id, instanceId));
        for (const table of Object.values(eventTables)) {
            await tx.delete(table as any).where(eq((table as any).instance_id, instanceId));
        }
    });
}
