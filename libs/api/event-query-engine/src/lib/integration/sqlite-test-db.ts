import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
    drizzle,
    type AsyncBatchRemoteCallback,
    type AsyncRemoteCallback,
} from 'drizzle-orm/sqlite-proxy';
import { EventCacheDb } from '../cache/cache.interface';
import { SCHEMA_STATEMENTS } from '../cache/impl/schema/schema-initializer';

/**
 * A ready-to-use in-memory cache database plus its teardown handle.
 */
export interface TestCacheDb {
    /** Drizzle handle satisfying the same {@link EventCacheDb} contract operators receive in production. */
    db: EventCacheDb;
    /** Closes the underlying SQLite connection and frees its memory. */
    close(): void;
}

/**
 * Builds an in-memory SQLite cache database for node-side tests.
 *
 * The database runs the production SQLite engine (`@sqlite.org/sqlite-wasm`) on its
 * in-memory VFS and is reached through the same `drizzle-orm/sqlite-proxy` driver the
 * application wires to the OPFS worker, so operators execute real SQL against the real
 * dialect. Only the storage VFS and the worker transport differ from production; SQL
 * semantics, the bind-variable limit, and value coercion are identical.
 *
 * The schema is created from the production `SCHEMA_STATEMENTS` before the handle is
 * returned, and every batch is wrapped in a transaction, mirroring the worker host.
 *
 * @returns A connected {@link TestCacheDb}; call {@link TestCacheDb.close} when done.
 */
export async function makeCacheDb(): Promise<TestCacheDb> {
    const sqlite3 = await sqlite3InitModule();
    const raw = new sqlite3.oo1.DB(':memory:');
    for (const statement of SCHEMA_STATEMENTS) {
        raw.exec(statement);
    }

    const runStatement = (statement: string, params: unknown[], method: string): unknown[] => {
        const rows = raw.exec({
            sql: statement,
            bind: params as never,
            rowMode: 'array',
            returnValue: 'resultRows',
        }) as unknown[];
        return method === 'get' ? ((rows[0] as unknown[]) ?? []) : rows;
    };

    const exec: AsyncRemoteCallback = async (statement, params, method) => ({
        rows: runStatement(statement, params, method),
    });

    const batch: AsyncBatchRemoteCallback = async (queries) => {
        raw.exec('BEGIN');
        try {
            const results = queries.map((query) => ({
                rows: runStatement(query.sql, query.params, query.method),
            }));
            raw.exec('COMMIT');
            return results;
        } catch (error) {
            raw.exec('ROLLBACK');
            throw error;
        }
    };

    return { db: drizzle(exec, batch), close: () => raw.close() };
}
