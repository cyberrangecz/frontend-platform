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

    const statements: unknown[] = [];

    for (const [eventType, eventRows] of Object.entries(byType)) {
        const table = (eventTables as Record<string, any>)[eventType];
        if (!table) continue;
        const columnCount = Object.keys(getTableColumns(table)).length;
        const rowsPerChunk = Math.max(1, Math.floor(BIND_VARIABLE_BUDGET / columnCount));
        for (const chunk of chunkRows(eventRows, rowsPerChunk)) {
            statements.push(db.insert(table).values(chunk.map(normalizeRow)).onConflictDoNothing());
        }
    }

    for (const [key, eventRows] of Object.entries(byTypeAndInstance)) {
        const separator = key.lastIndexOf(':');
        const eventType = key.slice(0, separator);
        const instanceId = Number(key.slice(separator + 1));
        const maxTimestamp = Math.max(...eventRows.map((row) => row.timestamp));

        statements.push(
            db
                .insert(watermarkTable)
                .values({ instance_id: instanceId, event_type: eventType, max_timestamp: maxTimestamp, last_synced: now })
                .onConflictDoUpdate({
                    target: [watermarkTable.instance_id, watermarkTable.event_type],
                    set: {
                        max_timestamp: sql`max(excluded.max_timestamp, ${watermarkTable.max_timestamp})`,
                        last_synced: now,
                    },
                }),
        );
    }

    if (statements.length === 0) return;
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
}

/**
 * Splits rows into chunks no larger than the given size.
 *
 * @param rows Rows to split.
 * @param size Maximum rows per chunk.
 * @returns Array of row chunks.
 */
function chunkRows(rows: RawEventRow[], size: number): RawEventRow[][] {
    const chunks: RawEventRow[][] = [];
    for (let start = 0; start < rows.length; start += size) {
        chunks.push(rows.slice(start, start + size));
    }
    return chunks;
}

/**
 * Groups rows by their event type.
 *
 * @param rows Rows to group.
 * @returns Rows keyed by event type.
 */
function groupByType(rows: RawEventRow[]): Record<string, RawEventRow[]> {
    return rows.reduce(
        (acc, row) => {
            (acc[row.type] ??= []).push(row);
            return acc;
        },
        {} as Record<string, RawEventRow[]>,
    );
}

/**
 * Groups rows by the composite `type:instance_id` key used for watermark advancement.
 *
 * @param rows Rows to group.
 * @returns Rows keyed by `type:instance_id`.
 */
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

/**
 * Drops an undefined `id` so the cache database generates one.
 *
 * @param row Raw event row.
 * @returns Row with `id` present only when defined.
 */
function normalizeRow({ id, ...rest }: RawEventRow): Record<string, unknown> {
    return id !== undefined ? { id, ...rest } : { ...rest };
}
