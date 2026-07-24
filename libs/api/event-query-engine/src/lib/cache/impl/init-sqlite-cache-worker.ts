/// <reference lib="webworker" />

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { OpfsSAHPoolDatabase, Sqlite3Static, SqlValue } from '@sqlite.org/sqlite-wasm';
import { SCHEMA_STATEMENTS } from './schema/schema-initializer';

/**
 * Options for opening the OPFS-SAHPool-backed SQLite cache database from inside
 * a worker.
 */
export interface SahPoolDatabaseOptions {
    /**
     * Root-relative URL the worker fetches the SQLite WASM binary from. Defaults
     * to `/sqlite3.wasm`, matching the asset wiring each app declares in its
     * `project.json`.
     */
    wasmUrl?: string;
    /**
     * Name the SAHPool VFS registers under; it also seeds the OPFS metadata
     * directory (`.<vfsName>`). Set per-app so deployments sharing an origin keep
     * isolated storage. Defaults to `event-cache-v1`.
     */
    vfsName?: string;
    /**
     * Path of the database file within the SAHPool VFS. Defaults to
     * `/event-cache.sqlite3`.
     */
    databasePath?: string;
    /**
     * Initial SAHPool capacity — the number of OPFS files the pool pre-opens.
     * Must be at least twice the number of database files to leave room for
     * journals. Defaults to 6.
     */
    initialCapacity?: number;
}

const DEFAULT_WASM_URL = '/sqlite3.wasm';
const DEFAULT_VFS_NAME = 'event-cache-v1';
const DEFAULT_DATABASE_PATH = '/event-cache.sqlite3';
const DEFAULT_INITIAL_CAPACITY = 6;

const POOL_ACQUIRE_MAX_ATTEMPTS = 5;
const POOL_ACQUIRE_BACKOFF_MS = 150;

/**
 * Runtime configuration accepted by the SQLite WASM module factory. The shipped
 * type declares the factory as taking no arguments, so this narrows the Emscripten
 * options actually honored at runtime.
 */
interface Sqlite3ModuleConfig {
    wasmBinary?: ArrayBuffer;
    print?: (message: string) => void;
    printErr?: (message: string) => void;
}

const initializeSqlite3Module = sqlite3InitModule as unknown as (
    config?: Sqlite3ModuleConfig,
) => Promise<Sqlite3Static>;

/**
 * Opens the event-cache SQLite database on the OPFS-SAHPool VFS.
 *
 * The SAHPool VFS pins a small, fixed pool of OPFS sync access handles and
 * reclaims handles orphaned by a prior page at startup. Because that reclamation
 * is not instantaneous when a prior page's worker is still tearing down, pool
 * acquisition is retried with linear backoff so a rapid reload that briefly
 * collides with the outgoing worker still boots.
 *
 * Must run inside a worker — `installOpfsSAHPoolVfs` relies on
 * `FileSystemSyncAccessHandle`, which exists only off the main thread.
 *
 * @param options Storage name, WASM URL, database path, and pool capacity
 *   overrides. All fields optional.
 * @returns Promise resolving to a ready SAHPool-backed database.
 * @throws When pool acquisition fails on every attempt.
 */
export async function openSahPoolDatabase(
    options: SahPoolDatabaseOptions = {},
): Promise<OpfsSAHPoolDatabase> {
    const {
        wasmUrl = DEFAULT_WASM_URL,
        vfsName = DEFAULT_VFS_NAME,
        databasePath = DEFAULT_DATABASE_PATH,
        initialCapacity = DEFAULT_INITIAL_CAPACITY,
    } = options;

    const wasmBinary = await fetch(wasmUrl).then((response) => response.arrayBuffer());
    const sqlite3 = await initializeSqlite3Module({ wasmBinary });

    let lastError: unknown;
    for (let attempt = 1; attempt <= POOL_ACQUIRE_MAX_ATTEMPTS; attempt++) {
        try {
            const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
                name: vfsName,
                initialCapacity,
                clearOnInit: false,
            });
            return new poolUtil.OpfsSAHPoolDb(databasePath);
        } catch (error) {
            lastError = error;
            if (attempt < POOL_ACQUIRE_MAX_ATTEMPTS) {
                console.warn(
                    `[event-query-engine] SAHPool acquisition attempt ${attempt} failed; retrying.`,
                    error,
                );
                await delay(POOL_ACQUIRE_BACKOFF_MS * attempt);
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('[event-query-engine] SAHPool VFS acquisition failed.');
}

/**
 * Resolves after the given delay.
 *
 * @param milliseconds Delay before resolving.
 * @returns Promise that resolves once the delay elapses.
 */
function delay(milliseconds: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

/** Drizzle SQLite-proxy execution methods the worker honors. */
type ExecMethod = 'run' | 'all' | 'values' | 'get';

/** Single-statement execution request from the main-thread Drizzle proxy. */
interface ExecRequest {
    id: number;
    type: 'exec';
    sql: string;
    params: SqlValue[];
    method: ExecMethod;
}

/** Atomic multi-statement (batch) execution request from the main-thread Drizzle proxy. */
interface BatchRequest {
    id: number;
    type: 'batch';
    queries: { sql: string; params: SqlValue[]; method: ExecMethod }[];
}

type CacheWorkerRequest = ExecRequest | BatchRequest;

/**
 * Boots the SQLite event-cache worker. Call once from each app's worker entry
 * (`cache.worker.ts`) — the entry must live in the app because the bundler requires
 * `new URL('./cache.worker.ts', import.meta.url)` to resolve relative to the app bundle.
 *
 * Opens the SAHPool database, applies the schema once before serving any request, then answers
 * single-statement and atomic batch execution requests posted by the main-thread Drizzle proxy.
 *
 * @param options Storage name, WASM URL, database path, and pool capacity overrides. All optional.
 */
export function initSqliteCacheWorker(options: SahPoolDatabaseOptions = {}): void {
    const databaseReady = openSahPoolDatabase(options).then((database) => {
        for (const statement of SCHEMA_STATEMENTS) {
            database.exec(statement);
        }
        return database;
    });

    self.addEventListener('message', (event: MessageEvent<CacheWorkerRequest>) => {
        void answerRequest(databaseReady, event.data);
    });
}

/**
 * Resolves the request against the ready database and posts the result, or posts the error.
 *
 * @param databaseReady Promise of the ready, schema-applied database.
 * @param request Single-statement or batch execution request.
 */
async function answerRequest(
    databaseReady: Promise<OpfsSAHPoolDatabase>,
    request: CacheWorkerRequest,
): Promise<void> {
    try {
        const database = await databaseReady;
        const data =
            request.type === 'batch'
                ? runBatch(database, request.queries)
                : runStatement(database, request.sql, request.params, request.method);
        self.postMessage({ id: request.id, data });
    } catch (error) {
        const failure = error as Error;
        self.postMessage({ id: request.id, error: `${failure?.name}: ${failure?.message}` });
    }
}

/**
 * Runs a sequence of statements inside a single transaction, rolling back on any failure so a
 * partial batch never persists.
 *
 * @param database Ready SAHPool database.
 * @param queries Statements to execute atomically.
 * @returns One result envelope per statement, in input order.
 */
function runBatch(
    database: OpfsSAHPoolDatabase,
    queries: BatchRequest['queries'],
): { rows: SqlValue[] | SqlValue[][] }[] {
    database.exec('BEGIN');
    try {
        const results = queries.map((query) => ({
            rows: runStatement(database, query.sql, query.params, query.method),
        }));
        database.exec('COMMIT');
        return results;
    } catch (error) {
        database.exec('ROLLBACK');
        throw error;
    }
}

/**
 * Executes one statement and returns rows shaped for the Drizzle SQLite-proxy method.
 *
 * @param database Ready SAHPool database.
 * @param sql SQL text with `?` placeholders.
 * @param params Positional bind parameters.
 * @param method Proxy method governing the result shape.
 * @returns `[]` for `run`; the single row (value array) for `get`; all rows (array of value arrays)
 *   for `all`/`values`.
 */
function runStatement(
    database: OpfsSAHPoolDatabase,
    sql: string,
    params: SqlValue[],
    method: ExecMethod,
): SqlValue[] | SqlValue[][] {
    if (method === 'run') {
        database.exec({ sql, bind: params });
        return [];
    }
    const rows = database.exec({
        sql,
        bind: params,
        rowMode: 'array',
        returnValue: 'resultRows',
    }) as SqlValue[][];
    return method === 'get' ? (rows[0] ?? []) : rows;
}
