// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCacheDb, type TestCacheDb } from '../../../integration/sqlite-test-db';
import {
    COMMAND_TYPE,
    LEVEL_STARTED_TYPE,
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

describe('getWatermarks — selection semantics', () => {
    it('returns an empty array when eventTypes is empty', async () => {
        await insert(cache.db, [makeLevelStartedRow({ instance_id: 1 })]);
        const result = await getWatermarks(cache.db, 1, []);
        expect(result).toEqual([]);
    });

    it('omits entries that are absent for the requested instance and types', async () => {
        await insert(cache.db, [makeLevelStartedRow({ instance_id: 1 })]);
        const result = await getWatermarks(cache.db, 1, [LEVEL_STARTED_TYPE, COMMAND_TYPE]);
        expect(result).toHaveLength(1);
        expect(result[0].eventType).toBe(LEVEL_STARTED_TYPE);
    });

    it('returns mapped entries carrying the requested instance id and type', async () => {
        const instanceId = 3;
        await insert(cache.db, [makeLevelStartedRow({ instance_id: instanceId, timestamp: 7_000 })]);
        const result = await getWatermarks(cache.db, instanceId, [LEVEL_STARTED_TYPE]);
        expect(result[0].instanceId).toBe(instanceId);
        expect(result[0].eventType).toBe(LEVEL_STARTED_TYPE);
        expect(result[0].maxTimestamp).toBe(7_000);
    });
});
