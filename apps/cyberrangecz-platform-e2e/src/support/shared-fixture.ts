import { existsSync } from 'node:fs';
import type { AccountKey, BrowserKey } from './accounts';
import { readState, statePaths, writeState } from './state-files';

/** Entities the shared setup creates once per suite run, read by every later stage. */
export interface SharedFixture {
    /** Short stamp of the suite run, part of every entity name the run creates. */
    runStamp: string;
    userIds: Record<AccountKey, number>;
    sandboxDefinition: { id: number; url: string; rev: string };
    pool: { id: number; maxSize: number };
    trainingDefinition: { id: number; title: string };
    trainingInstance: { id: number; title: string; accessToken: string };
}

/** What one browser's chain leaves behind for the review and destructive stages. */
export interface ChainRecord {
    /** Pool the chain's allocation unit belongs to. */
    poolId: number;
    allocationUnitId: number;
    trainingRunId?: number;
    /** Allocation unit the platform assigned to the training run, not necessarily the chain's own. */
    trainingRunAllocationUnitId?: number;
    finished?: boolean;
    /** The answer the platform revealed in the variant answers level's solution, which the trainee then submitted. */
    variantAnswer?: string;
    /** The finished time proximity detection the browser's read-only review specs share. */
    cheatingDetectionId?: number;
}

const SHARED_PRODUCER = 'the shared setup project';

export function readSharedFixture(): SharedFixture {
    return readState<SharedFixture>(statePaths.shared, SHARED_PRODUCER);
}

export function writeSharedFixture(fixture: SharedFixture): void {
    writeState(statePaths.shared, fixture);
}

export function readChainRecord(browser: BrowserKey): ChainRecord {
    return readState<ChainRecord>(statePaths.chain(browser), `the ${browser}-chain project`);
}

/** The browser's chain record when it was written for the given pool, so by the current suite run. */
export function findChainRecordOfPool(browser: BrowserKey, poolId: number): ChainRecord | undefined {
    if (!existsSync(statePaths.chain(browser))) {
        return undefined;
    }
    const record = readChainRecord(browser);
    return record.poolId === poolId ? record : undefined;
}

/** Starts the browser's chain record afresh, discarding one left by an earlier suite run. */
export function writeChainRecord(browser: BrowserKey, record: ChainRecord): void {
    writeState(statePaths.chain(browser), record);
}

/** Merges new fields into the browser's existing chain record. */
export function updateChainRecord(browser: BrowserKey, update: Partial<ChainRecord>): ChainRecord {
    const next = { ...readChainRecord(browser), ...update };
    writeState(statePaths.chain(browser), next);
    return next;
}
