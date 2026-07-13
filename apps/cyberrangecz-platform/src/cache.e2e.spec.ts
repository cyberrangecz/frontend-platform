// @vitest-environment node
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PGlite } from '@electric-sql/pglite';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { PlatformEventType } from '@crczp/visualization-model';
import {
    CacheService,
    provideEventBroker,
    RawEventRow,
} from '@crczp/event-query-engine';
import { applyNodeTestEnvironment, provideTestPortalConfig } from '@crczp/test-utils';

applyNodeTestEnvironment();

const activePgs: PGlite[] = [];

async function createDbPromise(): Promise<PgliteDatabase> {
    const pg = new PGlite();
    activePgs.push(pg);
    await pg.waitReady;
    return drizzle(pg as any) as unknown as PgliteDatabase;
}

afterEach(async () => {
    TestBed.resetTestingModule();
    while (activePgs.length) {
        await activePgs.pop()!.close().catch(() => {});
    }
});

let rowId = 0;

function makeRow(overrides: Partial<RawEventRow> = {}): RawEventRow {
    return {
        id: `row-${++rowId}`,
        type: PlatformEventType.TRAINING_RUN_STARTED,
        instance_id: 1,
        timestamp: Date.now(),
        sandbox_id: 'sb-1',
        pool_id: 10,
        training_definition_id: 20,
        training_instance_id: 1,
        training_run_id: 100,
        level_id: 5,
        user_ref_id: 7,
        training_time: 500,
        level_order: 1,
        actual_score_in_level: 0,
        total_training_level_score: 100,
        total_assessment_level_score: 0,
        ...overrides,
    } as RawEventRow;
}

function setupCache(overrides?: Parameters<typeof provideTestPortalConfig>[0]): CacheService {
    TestBed.configureTestingModule({
        providers: [
            provideEventBroker(createDbPromise()),
            provideTestPortalConfig(overrides),
        ],
    });
    return TestBed.inject(CacheService);
}

describe('Cache E2E — production defaults', () => {
    it('inserts rows and exposes them via watermarks', async () => {
        const cache = setupCache();

        await firstValueFrom(cache.insert([
            makeRow({ timestamp: 1_000 }),
            makeRow({ timestamp: 2_000 }),
        ]));

        const watermarks = await firstValueFrom(
            cache.getWatermarks(1, [PlatformEventType.TRAINING_RUN_STARTED]),
        );

        expect(watermarks).toHaveLength(1);
        expect(watermarks[0].instanceId).toBe(1);
        expect(watermarks[0].maxTimestamp).toBe(2_000);
    });

    it('watermark advances across sequential inserts', async () => {
        const cache = setupCache();

        await firstValueFrom(cache.insert([makeRow({ id: 'a', timestamp: 1_000 })]));
        await firstValueFrom(cache.insert([makeRow({ id: 'b', timestamp: 5_000 })]));

        const [watermark] = await firstValueFrom(
            cache.getWatermarks(1, [PlatformEventType.TRAINING_RUN_STARTED]),
        );

        expect(watermark.maxTimestamp).toBe(5_000);
    });

    it('7-day TTL preserves freshly synced data', async () => {
        const cache = setupCache();

        await firstValueFrom(cache.insert([makeRow()]));
        await firstValueFrom(cache.evictStaleInstances());

        const freshWatermarks = await firstValueFrom(
            cache.getWatermarks(1, [PlatformEventType.TRAINING_RUN_STARTED]),
        );

        expect(freshWatermarks).not.toHaveLength(0);
    });

    it('500 MB size cap does not evict a freshly populated small cache', async () => {
        const cache = setupCache();

        await firstValueFrom(cache.insert([makeRow({ instance_id: 1 })]));
        await firstValueFrom(cache.insert([makeRow({ instance_id: 2 })]));
        await firstValueFrom(cache.evictStaleInstances());

        const [instance1Watermarks, instance2Watermarks] = await Promise.all([
            firstValueFrom(cache.getWatermarks(1, [PlatformEventType.TRAINING_RUN_STARTED])),
            firstValueFrom(cache.getWatermarks(2, [PlatformEventType.TRAINING_RUN_STARTED])),
        ]);

        expect(instance1Watermarks).not.toHaveLength(0);
        expect(instance2Watermarks).not.toHaveLength(0);
    });

    it('purge removes all rows and watermarks for the given instance only', async () => {
        const cache = setupCache();

        await firstValueFrom(cache.insert([makeRow({ instance_id: 1 })]));
        await firstValueFrom(cache.insert([makeRow({ instance_id: 2 })]));
        await firstValueFrom(cache.purge(1));

        const [purgedInstanceWatermarks, survivingInstanceWatermarks] = await Promise.all([
            firstValueFrom(cache.getWatermarks(1, [PlatformEventType.TRAINING_RUN_STARTED])),
            firstValueFrom(cache.getWatermarks(2, [PlatformEventType.TRAINING_RUN_STARTED])),
        ]);

        expect(purgedInstanceWatermarks).toHaveLength(0);
        expect(survivingInstanceWatermarks).not.toHaveLength(0);
    });
});

describe('Cache E2E — TTL eviction', () => {
    it('TTL=0 evicts every instance immediately', async () => {
        const cache = setupCache({ caching: { eventCacheTTL: 0 } });

        await firstValueFrom(cache.insert([makeRow()]));
        await firstValueFrom(cache.evictStaleInstances());

        const evictedWatermarks = await firstValueFrom(
            cache.getWatermarks(1, [PlatformEventType.TRAINING_RUN_STARTED]),
        );

        expect(evictedWatermarks).toHaveLength(0);
    });

    it('prod TTL preserves all instances when both are freshly synced', async () => {
        const cache = setupCache();

        await firstValueFrom(cache.insert([makeRow({ instance_id: 1 })]));
        await firstValueFrom(cache.insert([makeRow({ instance_id: 2 })]));
        await firstValueFrom(cache.evictStaleInstances());

        const [instance1Watermarks, instance2Watermarks] = await Promise.all([
            firstValueFrom(cache.getWatermarks(1, [PlatformEventType.TRAINING_RUN_STARTED])),
            firstValueFrom(cache.getWatermarks(2, [PlatformEventType.TRAINING_RUN_STARTED])),
        ]);

        expect(instance1Watermarks).not.toHaveLength(0);
        expect(instance2Watermarks).not.toHaveLength(0);
    });
});
