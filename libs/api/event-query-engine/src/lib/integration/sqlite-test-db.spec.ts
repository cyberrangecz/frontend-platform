// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { makeCacheDb, type TestCacheDb } from './sqlite-test-db';

describe('makeCacheDb — node test harness', () => {
    let cache: TestCacheDb;

    beforeEach(async () => {
        cache = await makeCacheDb();
    });

    afterEach(() => {
        cache.close();
    });

    it('materializes the cache schema so event and watermark tables exist', async () => {
        const tables = await cache.db.all<string[]>(
            sql`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`,
        );
        const names = tables.map((row) => row[0]);
        expect(names).toContain('watermarks');
        expect(names.length).toBeGreaterThan(1);
    });

    it('round-trips writes and reads through the drizzle proxy', async () => {
        await cache.db.run(sql`CREATE TABLE probe (id INTEGER PRIMARY KEY, label TEXT NOT NULL)`);
        await cache.db.run(sql`INSERT INTO probe (id, label) VALUES (7, 'seven')`);
        const rows = await cache.db.all<[number, string]>(sql`SELECT id, label FROM probe`);
        expect(rows).toEqual([[7, 'seven']]);
    });

    it('rolls the whole batch back when one statement in it fails', async () => {
        await cache.db.run(sql`CREATE TABLE solo (id INTEGER PRIMARY KEY)`);
        await expect(
            cache.db.batch([
                cache.db.run(sql`INSERT INTO solo (id) VALUES (1)`),
                cache.db.run(sql`INSERT INTO solo (id) VALUES (1)`),
            ]),
        ).rejects.toThrow();
        const rows = await cache.db.all<[number]>(sql`SELECT id FROM solo`);
        expect(rows).toEqual([]);
    });
});
