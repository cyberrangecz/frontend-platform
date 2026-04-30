import { PgliteDatabase } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { eventTables, watermarkTable } from '../schema/schema';
import { RawEventRow } from '../../cache.interface';

export async function insert(db: PgliteDatabase, rows: RawEventRow[]): Promise<void> {
    if (rows.length === 0) return;

    const byType = groupByType(rows);
    const byTypeAndInstance = groupByTypeAndInstance(rows);
    const now = Date.now();

    await db.transaction(async (tx) => {
        for (const [eventType, eventRows] of Object.entries(byType)) {
            const table = (eventTables as any)[eventType];
            if (!table) continue;
            for (const row of eventRows) {
                await tx.insert(table).values(normalizeRow(row)).onConflictDoNothing();
            }
        }

        for (const [key, eventRows] of Object.entries(byTypeAndInstance)) {
            const sep = key.lastIndexOf(':');
            const eventType = key.slice(0, sep);
            const instanceId = Number(key.slice(sep + 1));
            const maxTimestamp = Math.max(...eventRows.map((r) => r.timestamp));

            await tx
                .insert(watermarkTable)
                .values({ instance_id: instanceId, event_type: eventType, max_timestamp: maxTimestamp, last_synced: now })
                .onConflictDoUpdate({
                    target: [watermarkTable.instance_id, watermarkTable.event_type],
                    set: {
                        max_timestamp: sql`GREATEST(excluded.max_timestamp, ${watermarkTable.max_timestamp})`,
                        last_synced: now,
                    },
                });
        }
    });
}

function groupByType(rows: RawEventRow[]): Record<string, RawEventRow[]> {
    return rows.reduce(
        (acc, row) => {
            (acc[row.type] ??= []).push(row);
            return acc;
        },
        {} as Record<string, RawEventRow[]>,
    );
}

function groupByTypeAndInstance(rows: RawEventRow[]): Record<string, RawEventRow[]> {
    return rows.reduce(
        (acc, row) => {
            const key = `${row.type}:${row.instance_id}`;
            (acc[key] ??= []).push(row);
            return acc;
        },
        {} as Record<string, RawEventRow[]>,
    );
}

function normalizeRow(row: RawEventRow): Record<string, unknown> {
    const base: Record<string, unknown> = {
        id: row.id,
        instance_id: row.instance_id,
        timestamp: row.timestamp,
        type: row.type,
    };
    for (const [key, value] of Object.entries(row)) {
        if (!(key in base)) base[key] = value;
    }
    return base;
}
