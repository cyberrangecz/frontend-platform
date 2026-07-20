import { getTableColumns, sql } from 'drizzle-orm';
import { eventTables, watermarkTable } from '../schema/schema';
import { EventCacheDb, RawEventRow } from '../../cache.interface';
import { BIND_VARIABLE_BUDGET } from '../../cache.config';

/**
 * Persists raw event rows: routes each row to its per-type table, inserts in bind-limited chunks
 * ignoring primary-key duplicates, and advances each (instance, type) watermark to the greatest
 * timestamp seen. All statements run in one atomic batch — watermarks commit only on full success.
 *
 * @param db Event-cache database handle.
 * @param rows Raw event rows of any mix of types.
 */
export async function insert(db: EventCacheDb, rows: RawEventRow[]): Promise<void> {
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
                        max_timestamp: sql`max(excluded.max_timestamp, ${watermarkTable.max_timestamp})`,
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

function normalizeRow({ id, ...rest }: RawEventRow): Record<string, unknown> {
    return id !== undefined ? { id, ...rest } : { ...rest };
}
