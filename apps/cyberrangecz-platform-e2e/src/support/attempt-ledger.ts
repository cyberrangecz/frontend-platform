import { existsSync } from 'node:fs';
import type { ApiClient } from './api/api-client';
import { removePool } from './pages/pool/pool-data';
import { readState, statePaths, writeState } from './state-files';

interface RecordedPool {
    poolId: number;
    attempt: number;
}

/**
 * The entities a spec's attempts created, kept in a state file so a retry in a fresh worker still
 * knows what the failed attempt left behind.
 */
export class AttemptLedger {
    constructor(
        private readonly scope: string,
        private readonly attempt: number,
    ) {}

    /** Records a pool the running attempt created. */
    recordPool(poolId: number): void {
        this.write([...this.read(), { poolId, attempt: this.attempt }]);
    }

    /**
     * Removes every pool recorded by an earlier attempt, each with its sandboxes, and forgets it.
     * Safe to run repeatedly; a pool that is already gone counts as removed.
     */
    async removeEarlierAttempts(sandbox: ApiClient): Promise<void> {
        for (const entry of this.read().filter(({ attempt }) => attempt < this.attempt)) {
            await removePool(sandbox, entry.poolId);
            this.write(this.read().filter((candidate) => candidate.poolId !== entry.poolId));
        }
    }

    private read(): RecordedPool[] {
        const path = statePaths.attemptLedger(this.scope);
        return existsSync(path) ? readState<RecordedPool[]>(path, 'the spec that records its pools') : [];
    }

    private write(entries: RecordedPool[]): void {
        writeState(statePaths.attemptLedger(this.scope), entries);
    }
}
