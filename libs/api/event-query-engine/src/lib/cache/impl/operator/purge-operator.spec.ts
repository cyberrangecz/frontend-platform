// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCacheDb, type TestCacheDb } from '../../../integration/sqlite-test-db';
import {
    countRows,
    countWatermarks,
    makeCommandRow,
    makeLevelStartedRow,
} from '../../../integration/cache-test-fixtures';
import { insert } from './insert-operator';
import { purge } from './purge-operator';

let cache: TestCacheDb;

beforeEach(async () => {
    cache = await makeCacheDb();
});

afterEach(() => {
    cache.close();
});

describe('purge — scoped deletion', () => {
    it('deletes all event rows and watermark entries for the target instance', async () => {
        const target = 1;
        await insert(cache.db, [
            makeLevelStartedRow({ instance_id: target }),
            makeCommandRow({ instance_id: target }),
        ]);

        await purge(cache.db, target);

        expect(await countRows(cache.db, 'level_started', target)).toBe(0);
        expect(await countRows(cache.db, 'command', target)).toBe(0);
        expect(await countWatermarks(cache.db, target)).toBe(0);
    });

    it('leaves a different instance untouched', async () => {
        const target = 1;
        const other = 2;
        await insert(cache.db, [makeLevelStartedRow({ instance_id: target })]);
        await insert(cache.db, [makeLevelStartedRow({ instance_id: other })]);

        await purge(cache.db, target);

        expect(await countRows(cache.db, 'level_started', target)).toBe(0);
        expect(await countRows(cache.db, 'level_started', other)).toBe(1);
        expect(await countWatermarks(cache.db, other)).toBe(1);
    });

    it('is a no-op when purging a non-existent instance', async () => {
        await insert(cache.db, [makeLevelStartedRow({ instance_id: 1 })]);
        await expect(purge(cache.db, 999)).resolves.not.toThrow();
        expect(await countRows(cache.db, 'level_started', 1)).toBe(1);
    });
});
