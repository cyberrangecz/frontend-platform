import { describe, expect, it, vi } from 'vitest';
import { createSqliteEventDb } from './create-sqlite-event-db';

/** Minimal Worker stand-in: the gating test never exercises message transport. */
function fakeWorker(): Worker {
    return { addEventListener: () => undefined, postMessage: () => undefined } as unknown as Worker;
}

describe('createSqliteEventDb', () => {
    it('defers worker construction until the until-gate resolves', async () => {
        const factory = vi.fn(fakeWorker);
        let openGate!: () => void;
        const until = new Promise<void>((resolve) => {
            openGate = resolve;
        });

        await createSqliteEventDb(factory, { until });
        await Promise.resolve();
        expect(factory).not.toHaveBeenCalled();

        openGate();
        await until;
        await Promise.resolve();
        expect(factory).toHaveBeenCalledOnce();
    });

    it('constructs the worker eagerly when no gate is supplied', async () => {
        const factory = vi.fn(fakeWorker);

        await createSqliteEventDb(factory);
        await Promise.resolve();

        expect(factory).toHaveBeenCalledOnce();
    });
});
