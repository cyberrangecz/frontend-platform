/// <reference lib="webworker" />

import type { Database, OpfsSAHPoolDatabase, SAHPoolUtil, Sqlite3Static, SqlValue } from '@sqlite.org/sqlite-wasm';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
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

const POOL_ACQUIRE_MAX_ATTEMPTS = 8;
const POOL_ACQUIRE_BACKOFF_MS = 150;

const IN_MEMORY_DATABASE_PATH = ':memory:';

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

/**
 * SAHPool installation options including `forceReinitIfPreviouslyFailed`, which the
 * runtime honors but the shipped types omit. Without it, a failed installation is
 * memoized per VFS name and every later call rethrows the cached rejection instead
 * of acquiring the pool again.
 */
type SahPoolInstallOptions = Parameters<Sqlite3Static['installOpfsSAHPoolVfs']>[0] & {
    forceReinitIfPreviouslyFailed?: boolean;
};

/** A ready cache database together with the pool holding its OPFS access handles. */
interface OpenedCacheDatabase {
    /** Connection the worker serves every request from. */
    database: Database;
    /** Pool owning the OPFS access handles, absent for the in-memory fallback. */
    poolUtil: SAHPoolUtil | null;
}

const initializeSqlite3Module = sqlite3InitModule as unknown as (
    config?: Sqlite3ModuleConfig,
) => Promise<Sqlite3Static>;

/**
 * Loads the SQLite WASM binary and initializes the module around it.
 *
 * @param wasmUrl Root-relative URL the binary is fetched from.
 * @returns Promise resolving to the initialized SQLite API.
 */
async function loadSqlite3(wasmUrl: string): Promise<Sqlite3Static> {
    const wasmBinary = await fetch(wasmUrl).then((response) => response.arrayBuffer());
    return initializeSqlite3Module({ wasmBinary });
}

/**
 * Acquires the SAHPool VFS, retrying with linear backoff.
 *
 * Each pool file is held under an exclusive OPFS access handle for the pool's whole
 * lifetime, so a pool whose handles are still held by a departing page rejects every
 * acquisition with `InvalidStateError` until those handles are released. Retrying
 * spans that window; `forceReinitIfPreviouslyFailed` is what makes a retry attempt
 * the acquisition again rather than replay the first failure.
 *
 * @param sqlite3 Initialized SQLite API.
 * @param vfsName Name the pool registers under.
 * @param initialCapacity Number of OPFS files the pool pre-opens.
 * @returns Promise resolving to the acquired pool.
 * @throws When acquisition fails on every attempt.
 */
async function acquireSahPool(
    sqlite3: Sqlite3Static,
    vfsName: string,
    initialCapacity: number,
): Promise<SAHPoolUtil> {
    const installOptions: SahPoolInstallOptions = {
        name: vfsName,
        initialCapacity,
        clearOnInit: false,
        forceReinitIfPreviouslyFailed: true,
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= POOL_ACQUIRE_MAX_ATTEMPTS; attempt++) {
        try {
            return await sqlite3.installOpfsSAHPoolVfs(installOptions);
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
 * Opens the event-cache SQLite database on the OPFS-SAHPool VFS.
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

    const sqlite3 = await loadSqlite3(wasmUrl);
    const poolUtil = await acquireSahPool(sqlite3, vfsName, initialCapacity);
    return new poolUtil.OpfsSAHPoolDb(databasePath);
}

/**
 * Opens the cache database, degrading to an in-memory connection when the OPFS pool
 * cannot be acquired. The in-memory connection serves the session normally and is
 * discarded with the worker, so the cache is rebuilt on the next visit.
 *
 * @param options Storage name, WASM URL, database path, and pool capacity overrides.
 * @returns Promise resolving to the connection and the pool backing it, if any.
 */
async function openCacheDatabase(
    options: SahPoolDatabaseOptions,
): Promise<OpenedCacheDatabase> {
    const {
        wasmUrl = DEFAULT_WASM_URL,
        vfsName = DEFAULT_VFS_NAME,
        databasePath = DEFAULT_DATABASE_PATH,
        initialCapacity = DEFAULT_INITIAL_CAPACITY,
    } = options;

    const sqlite3 = await loadSqlite3(wasmUrl);
    try {
        const poolUtil = await acquireSahPool(sqlite3, vfsName, initialCapacity);
        return { database: new poolUtil.OpfsSAHPoolDb(databasePath), poolUtil };
    } catch (error) {
        console.warn(
            '[event-query-engine] Event cache storage: in memory. The OPFS pool could not be acquired - nothing is persisted and the cache is rebuilt on the next visit.',
            error,
        );
        return {
            database: new sqlite3.oo1.DB({ filename: IN_MEMORY_DATABASE_PATH }),
            poolUtil: null,
        };
    }
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

/** Instruction to close the connection and hand the OPFS access handles back. */
interface ReleaseRequest {
    type: 'release';
}

type CacheWorkerRequest = ExecRequest | BatchRequest | ReleaseRequest;

/**
 * Boots the SQLite event-cache worker. Call once from each app's worker entry
 * (`cache.worker.ts`) — the entry must live in the app because the bundler requires
 * `new URL('./cache.worker.ts', import.meta.url)` to resolve relative to the app bundle.
 *
 * Opens the cache database, applies the schema once before serving any request, then answers
 * single-statement and atomic batch execution requests posted by the main-thread Drizzle proxy,
 * plus the release instruction that frees the OPFS access handles.
 *
 * @param options Storage name, WASM URL, database path, and pool capacity overrides. All optional.
 */
export function initSqliteCacheWorker(options: SahPoolDatabaseOptions = {}): void {
    const cacheReady = openCacheDatabase(options).then((opened) => {
        for (const statement of SCHEMA_STATEMENTS) {
            opened.database.exec(statement);
        }
        return opened;
    });

    let released = false;

    self.addEventListener('message', (event: MessageEvent<CacheWorkerRequest>) => {
        const request = event.data;
        if (request.type === 'release') {
            released = true;
            void cacheReady.then(releaseCache, () => undefined);
            return;
        }
        void answerRequest(cacheReady, request, () => released);
    });
}

/**
 * Closes the connection and unregisters the pool, returning its OPFS access handles so
 * another page can acquire them.
 *
 * @param opened Ready connection and the pool backing it, if any.
 */
function releaseCache(opened: OpenedCacheDatabase): void {
    try {
        opened.database.close();
        opened.poolUtil?.pauseVfs();
    } catch (error) {
        console.warn('[event-query-engine] Releasing the event cache failed.', error);
    }
}

/**
 * Resolves the request against the ready database and posts the result, or posts the error.
 *
 * @param cacheReady Promise of the ready, schema-applied cache.
 * @param request Single-statement or batch execution request.
 * @param isReleased Reports whether the connection has been handed back.
 */
async function answerRequest(
    cacheReady: Promise<OpenedCacheDatabase>,
    request: ExecRequest | BatchRequest,
    isReleased: () => boolean,
): Promise<void> {
    try {
        const { database } = await cacheReady;
        if (isReleased()) {
            throw new Error('The event cache was released and no longer accepts queries.');
        }
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
 * @param database Ready cache connection.
 * @param queries Statements to execute atomically.
 * @returns One result envelope per statement, in input order.
 */
function runBatch(
    database: Database,
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
 * @param database Ready cache connection.
 * @param sql SQL text with `?` placeholders.
 * @param params Positional bind parameters.
 * @param method Proxy method governing the result shape.
 * @returns `[]` for `run`; the single row (value array) for `get`; all rows (array of value arrays)
 *   for `all`/`values`.
 */
function runStatement(
    database: Database,
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
