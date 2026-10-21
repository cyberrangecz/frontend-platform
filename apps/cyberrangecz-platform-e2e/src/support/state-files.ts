import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { BrowserContextOptions } from '@playwright/test';
import type { AccountKey, BrowserKey } from './accounts';

const STATE_DIRECTORY = resolve(__dirname, '../../.state');

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

/** The value of the first local storage entry of that name across all origins of a storage state. */
export function storedValue(state: StorageStateObject, name: string): string | undefined {
    return state.origins
        .flatMap((origin) => origin.localStorage)
        .find((entry) => entry.name === name)?.value;
}
