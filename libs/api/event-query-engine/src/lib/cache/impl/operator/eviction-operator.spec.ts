// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCacheDb, type TestCacheDb } from '../../../integration/sqlite-test-db';
import {
    countRows,
    countWatermarks,
    LEVEL_STARTED_TYPE,
    makeEvictionConfig,
    seedLevelStartedRow,
    seedWatermark,
} from '../../../integration/cache-test-fixtures';
import { evictStaleInstances } from './eviction-operator';

let cache: TestCacheDb;

beforeEach(async () => {
    cache = await makeCacheDb();
});

afterEach(() => {
    cache.close();
});

describe('evictStaleInstances — size-based eviction', () => {
    it('never drops the last remaining instance even when over the size budget', async () => {
        const instanceId = 1;
        const now = Date.now();
        await seedWatermark(cache.db, instanceId, LEVEL_STARTED_TYPE, 5_000, now);
        for (let index = 0; index < 50; index += 1) {
            await seedLevelStartedRow(cache.db, instanceId, `seed-${index}`, 1_000 + index);
        }

        await evictStaleInstances(cache.db, makeEvictionConfig(3_600_000, 1));

        expect(await countWatermarks(cache.db, instanceId)).toBe(1);
        expect(await countRows(cache.db, 'level_started', instanceId)).toBe(50);
    });

    it('drops oldest-synced instances first until only the most-recent remains', async () => {
        const oldestInstance = 1;
        const middleInstance = 2;
        const newestInstance = 3;
        const now = Date.now();

        await seedWatermark(cache.db, oldestInstance, LEVEL_STARTED_TYPE, 5_000, now - 30_000);
        await seedWatermark(cache.db, middleInstance, LEVEL_STARTED_TYPE, 6_000, now - 20_000);
        await seedWatermark(cache.db, newestInstance, LEVEL_STARTED_TYPE, 7_000, now - 10_000);

        for (let index = 0; index < 5; index += 1) {
            await seedLevelStartedRow(cache.db, oldestInstance, `oldest-${index}`, 1_000 + index);
            await seedLevelStartedRow(cache.db, middleInstance, `middle-${index}`, 2_000 + index);
            await seedLevelStartedRow(cache.db, newestInstance, `newest-${index}`, 3_000 + index);
        }

        await evictStaleInstances(cache.db, makeEvictionConfig(3_600_000, 1));

        expect(await countWatermarks(cache.db, oldestInstance)).toBe(0);
        expect(await countRows(cache.db, 'level_started', oldestInstance)).toBe(0);
        expect(await countWatermarks(cache.db, middleInstance)).toBe(0);
        expect(await countRows(cache.db, 'level_started', middleInstance)).toBe(0);
        expect(await countWatermarks(cache.db, newestInstance)).toBe(1);
        expect(await countRows(cache.db, 'level_started', newestInstance)).toBe(5);
    });
});

describe('evictStaleInstances — TTL eviction', () => {
    it('drops the stale instance and keeps the fresh one across the TTL boundary', async () => {
        const staleInstance = 1;
        const freshInstance = 2;
        const ttlMs = 3_600_000;
        const now = Date.now();

        const staleSynced = now - (ttlMs + 600_000);
        const freshSynced = now - 60_000;

        await seedWatermark(cache.db, staleInstance, LEVEL_STARTED_TYPE, 5_000, staleSynced);
        await seedLevelStartedRow(cache.db, staleInstance, 'stale-row', 5_000);
        await seedWatermark(cache.db, freshInstance, LEVEL_STARTED_TYPE, 6_000, freshSynced);
        await seedLevelStartedRow(cache.db, freshInstance, 'fresh-row', 6_000);

        await evictStaleInstances(cache.db, makeEvictionConfig(ttlMs, 1_000_000_000));

        expect(await countWatermarks(cache.db, staleInstance)).toBe(0);
        expect(await countRows(cache.db, 'level_started', staleInstance)).toBe(0);
        expect(await countWatermarks(cache.db, freshInstance)).toBe(1);
        expect(await countRows(cache.db, 'level_started', freshInstance)).toBe(1);
    });
});
