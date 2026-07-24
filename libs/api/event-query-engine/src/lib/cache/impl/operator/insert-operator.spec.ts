// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCacheDb, type TestCacheDb } from '../../../integration/sqlite-test-db';
import {
    countRows,
    countWatermarks,
    LEVEL_STARTED_TYPE,
    makeCommandRow,
    makeLevelStartedRow,
} from '../../../integration/cache-test-fixtures';
import { insert } from './insert-operator';
import { getWatermarks } from './watermark-query-operator';

let cache: TestCacheDb;

beforeEach(async () => {
    cache = await makeCacheDb();
});

afterEach(() => {
    cache.close();
});

describe('insert — watermark greatest-seen invariant', () => {
    it('never regresses max_timestamp when a later batch carries a lower max timestamp', async () => {
        const instanceId = 1;
        const higherTimestamp = 5_000;
        const lowerTimestamp = 2_000;

        await insert(cache.db, [
            makeLevelStartedRow({ instance_id: instanceId, timestamp: higherTimestamp }),
            makeLevelStartedRow({ instance_id: instanceId, timestamp: 3_000 }),
        ]);

        await insert(cache.db, [
            makeLevelStartedRow({ instance_id: instanceId, timestamp: lowerTimestamp }),
            makeLevelStartedRow({ instance_id: instanceId, timestamp: 1_500 }),
        ]);

        const watermarks = await getWatermarks(cache.db, instanceId, [LEVEL_STARTED_TYPE]);
        expect(watermarks).toHaveLength(1);
        expect(watermarks[0].maxTimestamp).toBe(higherTimestamp);
    });

    it('advances max_timestamp to the greatest timestamp within a single batch', async () => {
        const instanceId = 1;
        const greatest = 9_000;

        await insert(cache.db, [
            makeLevelStartedRow({ instance_id: instanceId, timestamp: 1_000 }),
            makeLevelStartedRow({ instance_id: instanceId, timestamp: greatest }),
            makeLevelStartedRow({ instance_id: instanceId, timestamp: 4_000 }),
        ]);

        const watermarks = await getWatermarks(cache.db, instanceId, [LEVEL_STARTED_TYPE]);
        expect(watermarks[0].maxTimestamp).toBe(greatest);
    });
});

describe('insert — last_synced advances even with no new rows', () => {
    it('keeps max_timestamp unchanged but advances last_synced when re-inserting duplicate ids', async () => {
        const instanceId = 1;
        const rows = [
            makeLevelStartedRow({ instance_id: instanceId, timestamp: 4_000 }),
            makeLevelStartedRow({ instance_id: instanceId, timestamp: 2_000 }),
        ];

        await insert(cache.db, rows);
        const first = await getWatermarks(cache.db, instanceId, [LEVEL_STARTED_TYPE]);
        const firstMax = first[0].maxTimestamp;
        const firstSynced = first[0].lastSynced;

        await insert(cache.db, rows);
        const second = await getWatermarks(cache.db, instanceId, [LEVEL_STARTED_TYPE]);

        expect(second[0].maxTimestamp).toBe(firstMax);
        expect(second[0].lastSynced).toBeGreaterThanOrEqual(firstSynced);
    });
});

describe('insert — command rows with optional fields', () => {
    it('persists a Command row that omits all nullable fields without throwing', async () => {
        const instanceId = 7;
        const row = makeCommandRow({ instance_id: instanceId });

        await expect(insert(cache.db, [row])).resolves.not.toThrow();
        expect(await countRows(cache.db, 'command', instanceId)).toBe(1);
    });

    it('persists a Command row that supplies all nullable fields', async () => {
        const instanceId = 8;
        const row = makeCommandRow({
            instance_id: instanceId,
            training_time: 3.14,
            command_arguments: '-la',
            hostname: 'host-1',
            username: 'root',
            wd: '/home',
            ip: '10.0.0.1',
        });

        await insert(cache.db, [row]);
        expect(await countRows(cache.db, 'command', instanceId)).toBe(1);
    });
});

describe('insert — duplicate-id dedup', () => {
    it('persists only one row when two rows share the same id', async () => {
        const instanceId = 1;
        const sharedId = 'shared-id';

        await insert(cache.db, [
            makeLevelStartedRow({ id: sharedId, instance_id: instanceId, timestamp: 1_000 }),
            makeLevelStartedRow({ id: sharedId, instance_id: instanceId, timestamp: 2_000 }),
        ]);

        expect(await countRows(cache.db, 'level_started', instanceId)).toBe(1);
    });

    it('does not error and does not duplicate when re-inserting the same id across batches', async () => {
        const instanceId = 1;
        const sharedId = 'shared-id-2';

        await insert(cache.db, [makeLevelStartedRow({ id: sharedId, instance_id: instanceId })]);
        await expect(
            insert(cache.db, [makeLevelStartedRow({ id: sharedId, instance_id: instanceId })]),
        ).resolves.not.toThrow();

        expect(await countRows(cache.db, 'level_started', instanceId)).toBe(1);
    });
});

describe('insert — empty input', () => {
    it('is a no-op for an empty rows array', async () => {
        await expect(insert(cache.db, [])).resolves.not.toThrow();
        expect(await countRows(cache.db, 'level_started', 1)).toBe(0);
        expect(await countWatermarks(cache.db, 1)).toBe(0);
    });
});

describe('insert — bulk insertion across the bind-variable chunk boundary', () => {
    it('persists every row when the batch far exceeds a single statement bind budget', async () => {
        const instanceId = 1;
        const rowCount = 3_500;
        const highestTimestamp = 9_000_000;
        const rows = Array.from({ length: rowCount }, (_, index) =>
            makeLevelStartedRow({ instance_id: instanceId, timestamp: index + 1 }),
        );
        rows[rows.length - 1] = makeLevelStartedRow({
            instance_id: instanceId,
            timestamp: highestTimestamp,
        });

        await insert(cache.db, rows);

        expect(await countRows(cache.db, 'level_started', instanceId)).toBe(rowCount);
        const watermarks = await getWatermarks(cache.db, instanceId, [LEVEL_STARTED_TYPE]);
        expect(watermarks[0].maxTimestamp).toBe(highestTimestamp);
    });
});
