import { closeSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { BrowserContextOptions } from '@playwright/test';
import type { AccountKey, BrowserKey } from './accounts';

const STATE_DIRECTORY = resolve(__dirname, '../../.state');
const LOCK_PATIENCE = 30_000; // ms
const LOCK_ABANDONED_AFTER = 10_000; // ms
const LOCK_RETRY_INTERVAL = 25; // ms

export type Origin = 'application' | 'deployed';

/** Locations of the files the suite hands between its stages. */
export const statePaths = {
    credentials: resolve(STATE_DIRECTORY, 'credentials.json'),
    shared: resolve(STATE_DIRECTORY, 'shared.json'),
    storageState: (account: AccountKey, origin: Origin = 'application') =>
        resolve(STATE_DIRECTORY, 'storage', `${origin}-${account}.json`),
    chain: (browser: BrowserKey) => resolve(STATE_DIRECTORY, `chain-${browser}.json`),
    attemptLedger: (scope: string) => resolve(STATE_DIRECTORY, 'attempts', `${scope}.json`),
};

/** Reads a JSON state file, failing with the stage that should have produced it. */
export function readState<T>(path: string, producer: string): T {
    try {
        return JSON.parse(readFileSync(path, 'utf8')) as T;
    } catch (cause) {
        throw new Error(`State file ${path} is missing or unreadable; ${producer} writes it`, {
            cause,
        });
    }
}

/** Writes a JSON state file readable by its owner only. */
export function writeState(path: string, value: unknown): void {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600 });
}

/**
 * Runs an action while holding an exclusive lock file beside a path, so worker processes of
 * one run take turns. A lock left behind by a process that died is taken over once it is old
 * enough to count as abandoned.
 *
 * @throws {Error} When the lock stays held by another process for longer than the suite waits.
 */
export function withFileLock<T>(path: string, action: () => T): T {
    const lockPath = `${path}.lock`;
    const deadline = Date.now() + LOCK_PATIENCE;
    for (;;) {
        try {
            closeSync(openSync(lockPath, 'wx', 0o600));
            break;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
                throw error;
            }
            if (isLockAbandoned(lockPath)) {
                rmSync(lockPath, { force: true });
            } else if (Date.now() > deadline) {
                throw new Error(`Lock ${lockPath} stayed held by another process`, { cause: error });
            } else {
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_RETRY_INTERVAL);
            }
        }
    }
    try {
        return action();
    } finally {
        rmSync(lockPath, { force: true });
    }
}

function isLockAbandoned(lockPath: string): boolean {
    try {
        return Date.now() - statSync(lockPath).mtimeMs > LOCK_ABANDONED_AFTER;
    } catch {
        return false;
    }
}

/** A storage state held as an object rather than a file path. */
export type StorageStateObject = Exclude<NonNullable<BrowserContextOptions['storageState']>, string>;

const storageStates = new Map<string, StorageStateObject>();

/** The storage state the auth setup saved at a path, read once per worker. */
export function readStorageState(path: string): StorageStateObject {
    let state = storageStates.get(path);
    if (!state) {
        state = readState<StorageStateObject>(path, 'the auth setup');
        storageStates.set(path, state);
    }
    return state;
}

/** The storage state as it is saved at a path right now, bypassing and refreshing the worker's copy. */
export function rereadStorageState(path: string): StorageStateObject {
    const state = readState<StorageStateObject>(path, 'the auth setup');
    storageStates.set(path, state);
    return state;
}

/** Replaces the storage state saved at a path in one step, so a concurrent reader never sees a partial file. */
export function saveStorageState(path: string, state: StorageStateObject): void {
    const temporaryPath = `${path}.${process.pid}.tmp`;
    writeState(temporaryPath, state);
    renameSync(temporaryPath, path);
    storageStates.set(path, state);
}

/** The value of the first local storage entry of that name across all origins of a storage state. */
export function storedValue(state: StorageStateObject, name: string): string | undefined {
    return state.origins
        .flatMap((origin) => origin.localStorage)
        .find((entry) => entry.name === name)?.value;
}
