// @vitest-environment node
import { JSDOM } from 'jsdom';
import { TestBed } from '@angular/core/testing';
import { PGlite } from '@electric-sql/pglite';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { PlatformEventType } from '@crczp/visualization-model';
import { eq } from 'drizzle-orm';
import { firstValueFrom, from, Observable, of, toArray } from 'rxjs';
import { signal } from '@angular/core';

import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { LinearTrainingInstanceApi } from '@crczp/training-api';

import { RawEventRow } from '../cache/cache.interface';
import { initializeSchema } from '../cache/impl/schema/schema-initializer';
import { insert } from '../cache/impl/operator/insert-operator';
import { getWatermarks } from '../cache/impl/operator/watermark-query-operator';
import { purge } from '../cache/impl/operator/purge-operator';
import { evictStaleInstances } from '../cache/impl/operator/eviction-operator';
import {
    levelStartedTable,
    trainingRunStartedTable,
    watermarkTable,
} from '../cache/impl/schema/schema';
import {
    EVENT_CACHE_DB,
    PgliteCacheService,
} from '../cache/impl/pglite-cache.service';
import { SyncService } from '../sync/impl/sync.service';
import { CacheSyncService } from '../sync/sync.interface';
import { EventFetchApi, EventFetchParams } from '../sync/event-fetch-api';
import { DataBrokerServiceImpl } from '../broker/impl/broker.service';

const _jsdom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
});
(globalThis as any).window ??= _jsdom.window;
(globalThis as any).document ??= _jsdom.window.document;
(globalThis as any).location ??= _jsdom.window.location;
(globalThis as any).navigator ??= _jsdom.window.navigator;
(globalThis as any).HTMLElement ??= _jsdom.window.HTMLElement;
(globalThis as any).Node ??= _jsdom.window.Node;

const activePgs: PGlite[] = [];

async function createWorkerDb(): Promise<PgliteDatabase> {
    const pg = new PGlite();
    await pg.waitReady;
    activePgs.push(pg);
    const db = drizzle(pg as any) as unknown as PgliteDatabase;
    await initializeSchema(db);
    return db;
}

afterEach(async () => {
    while (activePgs.length) {
        await activePgs
            .pop()!
            .close()
            .catch(() => {});
    }
});

function makeConfig(ttlSeconds = 7 * 24 * 3600, eventCacheMaxSize = 524_288_000): PortalConfig {
    return {
        polling: {
            pollingPeriodShort: 200,
            pollingPeriodLong: 5000,
            retryCount: 0,
        },
        caching: {
            endpointCachingDisabled: false,
            endpointCacheTTL: 300,
            eventCacheTTL: ttlSeconds,
            eventEntityCacheTTL: 300,
            eventCacheMaxStaleness: 1000,
            eventCacheMaxSize,
        },
    } as unknown as PortalConfig;
}

const TRAINING_BASE: Omit<RawEventRow, 'id'> = {
    type: PlatformEventType.TRAINING_RUN_STARTED,
    instance_id: 1,
    timestamp: 1000,
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
};

let rowId = 0;
function makeRow(overrides: Partial<RawEventRow> = {}): RawEventRow {
    return {
        ...TRAINING_BASE,
        id: `row-${++rowId}`,
        ...overrides,
    } as RawEventRow;
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE LAYER — operators against real in-memory PGlite (no backend, no mocks)
// ─────────────────────────────────────────────────────────────────────────────

describe('Cache layer — operators against real PGlite', () => {
    let db: PgliteDatabase;

    beforeEach(async () => {
        db = await createWorkerDb();
    });

    describe('insert + getWatermarks', () => {
        it('persists row and creates watermark entry', async () => {
            await insert(db, [makeRow({ timestamp: 5000 })]);

            const watermarks = await getWatermarks(db, 1, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);

            expect(watermarks).toHaveLength(1);
            expect(watermarks[0].instanceId).toBe(1);
            expect(watermarks[0].eventType).toBe(
                PlatformEventType.TRAINING_RUN_STARTED,
            );
            expect(watermarks[0].maxTimestamp).toBe(5000);
            expect(watermarks[0].lastSynced).toBeGreaterThan(0);
        });

        it('deduplicates rows with same id — second insert does not overwrite', async () => {
            const row = makeRow({ timestamp: 1000 });
            await insert(db, [row]);
            await insert(db, [{ ...row, timestamp: 9999 }]);

            const rows = await (db as any)
                .select()
                .from(trainingRunStartedTable);
            expect(rows).toHaveLength(1);
            expect(Number(rows[0].timestamp)).toBe(1000);
        });

        it('advances maxTimestamp to highest value across sequential inserts', async () => {
            await insert(db, [makeRow({ id: 'a', timestamp: 3000 })]);
            await insert(db, [makeRow({ id: 'b', timestamp: 7000 })]);

            const [wm] = await getWatermarks(db, 1, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);
            expect(wm.maxTimestamp).toBe(7000);
        });

        it('maxTimestamp never decreases when older rows arrive later', async () => {
            await insert(db, [makeRow({ id: 'a', timestamp: 9000 })]);
            await insert(db, [makeRow({ id: 'b', timestamp: 2000 })]);

            const [wm] = await getWatermarks(db, 1, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);
            expect(wm.maxTimestamp).toBe(9000);
        });

        it('routes rows to correct per-type tables', async () => {
            const startedRow = makeRow({
                type: PlatformEventType.TRAINING_RUN_STARTED,
            });
            const levelRow = makeRow({
                type: PlatformEventType.LEVEL_STARTED,
                level_type: 'TRAINING',
                level_title: 'Level 1',
                max_score: 100,
            });

            await insert(db, [startedRow, levelRow]);

            const started = await (db as any)
                .select()
                .from(trainingRunStartedTable);
            const levels = await (db as any).select().from(levelStartedTable);

            expect(started).toHaveLength(1);
            expect(levels).toHaveLength(1);
            expect(started[0].id).toBe(startedRow.id);
            expect(levels[0].id).toBe(levelRow.id);
        });

        it('creates separate watermarks per (instanceId, eventType) pair', async () => {
            await insert(db, [
                makeRow({ id: 'a', instance_id: 1, timestamp: 1000 }),
            ]);
            await insert(db, [
                makeRow({ id: 'b', instance_id: 2, timestamp: 2000 }),
            ]);

            const [wm1] = await getWatermarks(db, 1, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);
            const [wm2] = await getWatermarks(db, 2, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);

            expect(wm1.maxTimestamp).toBe(1000);
            expect(wm2.maxTimestamp).toBe(2000);
        });

        it('returns empty array for unknown (instanceId, eventType) pair', async () => {
            const watermarks = await getWatermarks(db, 99, [
                PlatformEventType.LEVEL_STARTED,
            ]);
            expect(watermarks).toHaveLength(0);
        });

        it('returns only requested event types from watermarks', async () => {
            await insert(db, [
                makeRow({
                    id: 'a',
                    type: PlatformEventType.TRAINING_RUN_STARTED,
                    timestamp: 100,
                }),
                makeRow({
                    id: 'b',
                    type: PlatformEventType.LEVEL_STARTED,
                    timestamp: 200,
                    level_type: 'TRAINING',
                    level_title: 'L1',
                    max_score: 50,
                }),
            ]);

            const watermarks = await getWatermarks(db, 1, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);

            expect(watermarks).toHaveLength(1);
            expect(watermarks[0].eventType).toBe(
                PlatformEventType.TRAINING_RUN_STARTED,
            );
        });

        it('ignores rows with unknown event type without throwing', async () => {
            await expect(
                insert(db, [
                    makeRow({ type: 'UnknownEvent' as PlatformEventType }),
                ]),
            ).resolves.toBeUndefined();
        });

        it('single-batch insert of multiple rows produces one watermark entry per (type, instance) pair', async () => {
            await insert(db, [
                makeRow({ id: 'a', timestamp: 100 }),
                makeRow({ id: 'b', timestamp: 500 }),
                makeRow({ id: 'c', timestamp: 300 }),
            ]);

            const [wm] = await getWatermarks(db, 1, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);
            expect(wm.maxTimestamp).toBe(500);
        });
    });

    describe('purge', () => {
        it('removes all rows and watermarks for target instance', async () => {
            await insert(db, [makeRow({ id: 'a', instance_id: 1 })]);
            await purge(db, 1);

            const rows = await (db as any)
                .select()
                .from(trainingRunStartedTable);
            const watermarks = await getWatermarks(db, 1, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);

            expect(rows).toHaveLength(0);
            expect(watermarks).toHaveLength(0);
        });

        it('does not affect rows or watermarks from other instances', async () => {
            await insert(db, [
                makeRow({ id: 'a', instance_id: 1 }),
                makeRow({ id: 'b', instance_id: 2 }),
            ]);
            await purge(db, 1);

            const rows = await (db as any)
                .select()
                .from(trainingRunStartedTable);
            expect(rows).toHaveLength(1);
            expect(rows[0].instance_id).toBe(2);

            const wm2 = await getWatermarks(db, 2, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);
            expect(wm2).toHaveLength(1);
        });

        it('is idempotent when instance has no data', async () => {
            await expect(purge(db, 999)).resolves.toBeUndefined();
        });
    });

    describe('evictStaleInstances', () => {
        it('deletes instance data and watermarks past TTL', async () => {
            await insert(db, [makeRow({ id: 'stale-row', instance_id: 55 })]);

            const staleLastSynced = Date.now() - 10 * 24 * 3600 * 1000;
            await (db as any).update(watermarkTable)
                .set({ last_synced: staleLastSynced })
                .where(eq(watermarkTable.instance_id, 55));

            await evictStaleInstances(db, makeConfig());

            const wm = await getWatermarks(db, 55, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);
            const rows = await (db as any)
                .select()
                .from(trainingRunStartedTable);

            expect(wm).toHaveLength(0);
            expect(rows.filter((r: any) => r.instance_id === 55)).toHaveLength(
                0,
            );
        });

        it('preserves instances whose last_synced is within TTL', async () => {
            await insert(db, [makeRow({ id: 'fresh', instance_id: 3 })]);

            await evictStaleInstances(db, makeConfig());

            const wm = await getWatermarks(db, 3, [
                PlatformEventType.TRAINING_RUN_STARTED,
            ]);
            expect(wm).toHaveLength(1);
        });

        it('evicts all stale instances when none is active', async () => {
            const now = Date.now();
            for (const [instanceId, ageMs] of [
                [10, 20 * 24 * 3600 * 1000],
                [11, 15 * 24 * 3600 * 1000],
            ] as [number, number][]) {
                await (db as any).insert(watermarkTable).values({
                    instance_id: instanceId,
                    event_type: PlatformEventType.TRAINING_RUN_STARTED,
                    max_timestamp: 1000,
                    last_synced: now - ageMs,
                });
            }

            await evictStaleInstances(db, makeConfig());

            expect(
                await getWatermarks(db, 10, [
                    PlatformEventType.TRAINING_RUN_STARTED,
                ]),
            ).toHaveLength(0);
            expect(
                await getWatermarks(db, 11, [
                    PlatformEventType.TRAINING_RUN_STARTED,
                ]),
            ).toHaveLength(0);
        });

        describe('size cap', () => {
            it('warns and evicts oldest instance when db exceeds size cap', async () => {
                await insert(db, [makeRow({ id: 'inst1-row', instance_id: 1 })]);
                await insert(db, [makeRow({ id: 'inst2-row', instance_id: 2 })]);

                // Instance 1 = older (least-recently-synced), instance 2 = newer
                await (db as any).update(watermarkTable)
                    .set({ last_synced: Date.now() - 5000 })
                    .where(eq(watermarkTable.instance_id, 1));
                await (db as any).update(watermarkTable)
                    .set({ last_synced: Date.now() })
                    .where(eq(watermarkTable.instance_id, 2));

                const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

                // maxSize = 1 byte: always exceeded; instance 1 is oldest so it is evicted first;
                // instance 2 is last remaining and is protected by the never-empty guard
                await evictStaleInstances(db, makeConfig(7 * 24 * 3600, 1));

                expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/\[EventCache\]/));
                warnSpy.mockRestore();

                expect(
                    await getWatermarks(db, 1, [PlatformEventType.TRAINING_RUN_STARTED]),
                ).toHaveLength(0);
                expect(
                    await getWatermarks(db, 2, [PlatformEventType.TRAINING_RUN_STARTED]),
                ).not.toHaveLength(0);
            });

            it('never empties the cache when size cap cannot be satisfied', async () => {
                await insert(db, [makeRow({ id: 'sole-row', instance_id: 1 })]);

                // maxSize = 1 byte and only one instance exists — guard keeps it
                await evictStaleInstances(db, makeConfig(7 * 24 * 3600, 1));

                expect(
                    await getWatermarks(db, 1, [PlatformEventType.TRAINING_RUN_STARTED]),
                ).not.toHaveLength(0);
            });

            it('does not evict when db is within size cap', async () => {
                await insert(db, [makeRow({ id: 'fresh-row', instance_id: 5 })]);

                // 1 GB cap: a freshly seeded test db will never reach this
                await evictStaleInstances(db, makeConfig(7 * 24 * 3600, 1_073_741_824));

                expect(
                    await getWatermarks(db, 5, [PlatformEventType.TRAINING_RUN_STARTED]),
                ).not.toHaveLength(0);
            });
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SYNC LAYER — SyncService with real CacheService; EventFetchApi is mocked
// ─────────────────────────────────────────────────────────────────────────────

describe('Sync layer — SyncService with real Cache + mocked EventFetchApi', () => {
    let mockFetch: { fetch: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        mockFetch = { fetch: vi.fn() };

        const dbPromise = createWorkerDb();

        TestBed.configureTestingModule({
            providers: [
                PgliteCacheService,
                SyncService,
                { provide: EVENT_CACHE_DB, useValue: dbPromise },
                { provide: PortalConfig, useValue: makeConfig() },
                { provide: EventFetchApi, useValue: mockFetch },
            ],
        });

        await dbPromise;
    });

    it('full cycle: no watermark → calls fetch → inserts rows → emits SyncTableComplete per type', async () => {
        mockFetch.fetch.mockReturnValue(
            of([makeRow({ id: 'fetched-1', timestamp: 500 })]),
        );
        const syncService = TestBed.inject(SyncService);

        const completions = await firstValueFrom(
            syncService
                .sync({
                    instanceId: 1,
                    eventTypes: [PlatformEventType.TRAINING_RUN_STARTED],
                })
                .pipe(toArray()),
        );

        expect(completions).toHaveLength(1);
        expect(completions[0]).toEqual({
            eventType: PlatformEventType.TRAINING_RUN_STARTED,
            instanceId: 1,
        });
        expect(mockFetch.fetch).toHaveBeenCalledOnce();
        expect(mockFetch.fetch).toHaveBeenCalledWith(
            expect.objectContaining({
                instanceId: 1,
                eventType: PlatformEventType.TRAINING_RUN_STARTED,
            }),
        );
    });

    it('fetched rows are persisted and queryable via CacheService after sync', async () => {
        const row = makeRow({ id: 'sync-row', timestamp: 1234 });
        mockFetch.fetch.mockReturnValue(of([row]));
        const syncService = TestBed.inject(SyncService);
        const cacheService = TestBed.inject(PgliteCacheService);

        await firstValueFrom(
            syncService.sync({
                instanceId: 1,
                eventTypes: [PlatformEventType.TRAINING_RUN_STARTED],
            }),
        );

        const rows = await firstValueFrom(
            cacheService.query(
                (db: any): Observable<any[]> =>
                    from<any[]>(db.select().from(trainingRunStartedTable)),
            ),
        );

        expect(rows.some((r) => r.id === 'sync-row')).toBe(true);
    });

    it('delta sync: existing watermark causes fetch to receive sinceTimestamp minus 500 ms buffer', async () => {
        mockFetch.fetch.mockReturnValue(of([]));
        const cacheService = TestBed.inject(PgliteCacheService);
        const syncService = TestBed.inject(SyncService);
        const dbPromise = TestBed.inject(EVENT_CACHE_DB);
        const db = await dbPromise;

        await firstValueFrom(
            cacheService.insert([makeRow({ id: 'seed', timestamp: 5000 })]),
        );

        // Make the watermark stale so sync actually fetches
        await (db as any).update(watermarkTable)
            .set({ last_synced: Date.now() - 60000 })
            .where(eq(watermarkTable.instance_id, 1));

        await firstValueFrom(
            syncService.sync({
                instanceId: 1,
                eventTypes: [PlatformEventType.TRAINING_RUN_STARTED],
            }),
        );

        const call = mockFetch.fetch.mock.calls[0][0] as EventFetchParams;
        expect(call.sinceTimestamp).toBe(5000 - 500);
    });

    it('fresh watermark (within 1 s) skips fetch entirely and still emits SyncTableComplete', async () => {
        mockFetch.fetch.mockReturnValue(of([]));
        const cacheService = TestBed.inject(PgliteCacheService);
        const syncService = TestBed.inject(SyncService);

        await firstValueFrom(
            cacheService.insert([
                makeRow({ id: 'fresh-seed', timestamp: 1000 }),
            ]),
        );

        const completions = await firstValueFrom(
            syncService
                .sync({
                    instanceId: 1,
                    eventTypes: [PlatformEventType.TRAINING_RUN_STARTED],
                })
                .pipe(toArray()),
        );

        expect(completions).toHaveLength(1);
        expect(mockFetch.fetch).not.toHaveBeenCalled();
    });

    it('emits one SyncTableComplete per declared type in declaration order', async () => {
        mockFetch.fetch.mockReturnValue(of([]));
        const syncService = TestBed.inject(SyncService);

        const completions = await firstValueFrom(
            syncService
                .sync({
                    instanceId: 1,
                    eventTypes: [
                        PlatformEventType.TRAINING_RUN_STARTED,
                        PlatformEventType.LEVEL_STARTED,
                    ],
                })
                .pipe(toArray()),
        );

        expect(completions).toHaveLength(2);
        expect(completions[0].eventType).toBe(
            PlatformEventType.TRAINING_RUN_STARTED,
        );
        expect(completions[1].eventType).toBe(PlatformEventType.LEVEL_STARTED);
    });

    it('fetch error terminates the stream with no completions emitted', async () => {
        mockFetch.fetch.mockReturnValue(
            new Observable((subscriber) =>
                subscriber.error(new Error('fetch failed')),
            ),
        );
        const syncService = TestBed.inject(SyncService);

        const completions: unknown[] = [];
        let errorMsg = '';

        await new Promise<void>((resolve) => {
            syncService
                .sync({
                    instanceId: 1,
                    eventTypes: [PlatformEventType.TRAINING_RUN_STARTED],
                })
                .subscribe({
                    next: (v) => completions.push(v),
                    error: (e) => {
                        errorMsg = e.message;
                        resolve();
                    },
                    complete: resolve,
                });
        });

        expect(errorMsg).toBeTruthy();
        expect(completions).toHaveLength(0);
    });

    it('COMMAND without poolId errors immediately before any fetch', async () => {
        mockFetch.fetch.mockReturnValue(of([]));
        const syncService = TestBed.inject(SyncService);

        let errorMsg = '';
        await new Promise<void>((resolve) => {
            syncService
                .sync({
                    instanceId: 1,
                    eventTypes: [PlatformEventType.COMMAND],
                })
                .subscribe({
                    error: (e) => {
                        errorMsg = e.message;
                        resolve();
                    },
                    complete: resolve,
                });
        });

        expect(errorMsg).toMatch(/pool/i);
        expect(mockFetch.fetch).not.toHaveBeenCalled();
    });

    it('COMMAND with poolId succeeds and forwards poolId to fetch', async () => {
        mockFetch.fetch.mockReturnValue(of([]));
        const syncService = TestBed.inject(SyncService);

        const completions = await firstValueFrom(
            syncService
                .sync({
                    instanceId: 1,
                    eventTypes: [PlatformEventType.COMMAND],
                    poolId: 42,
                })
                .pipe(toArray()),
        );

        expect(completions).toHaveLength(1);
        expect(
            (mockFetch.fetch.mock.calls[0][0] as EventFetchParams).poolId,
        ).toBe(42);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BROKER LAYER — DataBrokerServiceImpl with real Sync + Cache;
// EventFetchApi and LinearTrainingInstanceApi are mocked (no backend calls)
// ─────────────────────────────────────────────────────────────────────────────

describe('Broker layer — DataBrokerServiceImpl with real Sync + Cache', () => {
    let mockFetch: { fetch: ReturnType<typeof vi.fn> };
    let mockInstanceApi: { get: ReturnType<typeof vi.fn> };
    let mockErrorHandler: {
        emitFrontendErrorNotification: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        mockFetch = { fetch: vi.fn().mockReturnValue(of([])) };
        mockInstanceApi = { get: vi.fn() };
        mockErrorHandler = {
            emitFrontendErrorNotification: vi
                .fn()
                .mockReturnValue(of(undefined)),
        };

        const dbPromise = createWorkerDb();

        TestBed.configureTestingModule({
            providers: [
                PgliteCacheService,
                SyncService,
                DataBrokerServiceImpl,
                { provide: EVENT_CACHE_DB, useValue: dbPromise },
                { provide: PortalConfig, useValue: makeConfig() },
                { provide: EventFetchApi, useValue: mockFetch },
                { provide: CacheSyncService, useExisting: SyncService },
                {
                    provide: LinearTrainingInstanceApi,
                    useValue: mockInstanceApi,
                },
                { provide: ErrorHandlerService, useValue: mockErrorHandler },
            ],
        });

        await dbPromise;
    });

    it('query(): pre-seeded cache rows are returned after sync completes', async () => {
        const broker = TestBed.inject(DataBrokerServiceImpl);
        const cacheService = TestBed.inject(PgliteCacheService);
        await firstValueFrom(
            cacheService.insert([
                makeRow({ id: 'pre-seeded', instance_id: 1 }),
            ]),
        );

        const instanceSig = signal(1);
        const rows = await firstValueFrom(
            broker.query(
                instanceSig,
                [PlatformEventType.TRAINING_RUN_STARTED],
                (db: any): Observable<any[]> =>
                    from<any[]>(db.select().from(trainingRunStartedTable)),
            ),
        );

        expect(rows.some((r) => r.id === 'pre-seeded')).toBe(true);
    });

    it('query(): rows fetched by sync are queryable in the same cycle', async () => {
        const row = makeRow({
            id: 'synced-row',
            timestamp: 800,
            instance_id: 1,
        });
        mockFetch.fetch.mockReturnValue(of([row]));
        const broker = TestBed.inject(DataBrokerServiceImpl);

        const instanceSig = signal(1);
        const rows = await firstValueFrom(
            broker.query(
                instanceSig,
                [PlatformEventType.TRAINING_RUN_STARTED],
                (db: any): Observable<any[]> =>
                    from<any[]>(db.select().from(trainingRunStartedTable)),
            ),
        );

        expect(rows.some((r) => r.id === 'synced-row')).toBe(true);
    });

    it('query(): COMMAND type resolves poolId from instance API before sync', async () => {
        mockInstanceApi.get.mockReturnValue(of({ poolId: 55 }));
        const broker = TestBed.inject(DataBrokerServiceImpl);

        const instanceSig = signal(1);
        await firstValueFrom(
            broker.query(instanceSig, [PlatformEventType.COMMAND], (_db: any) =>
                of([]),
            ),
        );

        expect(mockInstanceApi.get).toHaveBeenCalledWith(1);
        expect(
            (mockFetch.fetch.mock.calls[0][0] as EventFetchParams).poolId,
        ).toBe(55);
    });

    it('query(): sync error is forwarded to ErrorHandlerService and stream terminates', async () => {
        mockFetch.fetch.mockReturnValue(
            new Observable((subscriber) =>
                subscriber.error(new Error('sync exploded')),
            ),
        );
        const broker = TestBed.inject(DataBrokerServiceImpl);

        const instanceSig = signal(1);
        let streamError: unknown = null;
        await new Promise<void>((resolve) => {
            broker
                .query(
                    instanceSig,
                    [PlatformEventType.TRAINING_RUN_STARTED],
                    (_db: any) => of([]),
                )
                .subscribe({
                    error: (e) => {
                        streamError = e;
                        resolve();
                    },
                    complete: resolve,
                });
        });

        expect(
            mockErrorHandler.emitFrontendErrorNotification,
        ).toHaveBeenCalled();
        expect(streamError).not.toBeNull();
    });

    it('query(): two concurrent signals with different instanceIds sync independently', async () => {
        const fetchedIds: number[] = [];
        mockFetch.fetch.mockImplementation((params: EventFetchParams) => {
            fetchedIds.push(params.instanceId);
            return of([]);
        });
        const broker = TestBed.inject(DataBrokerServiceImpl);

        await firstValueFrom(
            broker.query(
                signal(1),
                [PlatformEventType.TRAINING_RUN_STARTED],
                (_db: any) => of([]),
            ),
        );
        await firstValueFrom(
            broker.query(
                signal(2),
                [PlatformEventType.TRAINING_RUN_STARTED],
                (_db: any) => of([]),
            ),
        );

        expect(fetchedIds).toContain(1);
        expect(fetchedIds).toContain(2);
    });

    // Fake timers break PGlite's internal async operations (IndexedDB/Worker messaging),
    // so these polling tests must run on real timers with a short polling interval.
    it('queryPolling(): emits on first tick then again after interval elapses', async () => {
        const broker = TestBed.inject(DataBrokerServiceImpl);
        const intervalMs = makeConfig().polling.pollingPeriodShort;
        const emissions: unknown[] = [];

        const sub = broker
            .queryPolling(
                signal(1),
                [PlatformEventType.TRAINING_RUN_STARTED],
                (_db: any) => of([]),
            )
            .subscribe((v) => emissions.push(v));

        // timer(0, ...) fires the first emission; 300 ms padding for async pipeline
        await new Promise((r) => setTimeout(r, 300));
        expect(emissions.length).toBeGreaterThanOrEqual(1);

        // next emission after the polling interval elapses
        await new Promise((r) => setTimeout(r, intervalMs + 100));
        expect(emissions.length).toBeGreaterThanOrEqual(2);

        sub.unsubscribe();
    });

    it('queryPolling(): unsubscribe stops further fetch calls', async () => {
        const broker = TestBed.inject(DataBrokerServiceImpl);

        const sub = broker
            .queryPolling(
                signal(1),
                [PlatformEventType.TRAINING_RUN_STARTED],
                (_db: any) => of([]),
            )
            .subscribe();

        // let the first tick fire; 300 ms padding for async pipeline
        await new Promise((r) => setTimeout(r, 300));
        const callsAtUnsub = mockFetch.fetch.mock.calls.length;

        sub.unsubscribe();
        await new Promise((r) => setTimeout(r, makeConfig().polling.pollingPeriodShort * 5));

        expect(mockFetch.fetch.mock.calls.length).toBe(callsAtUnsub);
    });

    it('queryPolling(): signal change switches sync scope to new instanceId', async () => {
        const fetchedIds: number[] = [];
        mockFetch.fetch.mockImplementation((params: EventFetchParams) => {
            fetchedIds.push(params.instanceId);
            return of([]);
        });
        const broker = TestBed.inject(DataBrokerServiceImpl);
        const instanceSig = signal(1);

        const sub = broker
            .queryPolling(
                instanceSig,
                [PlatformEventType.TRAINING_RUN_STARTED],
                (_db: any) => of([]),
            )
            .subscribe();

        // first tick with instanceId=1; 300 ms padding for async pipeline
        await new Promise((r) => setTimeout(r, 300));
        expect(fetchedIds).toContain(1);

        instanceSig.set(2);
        // allow switchMap to re-subscribe and the new timer(0) to fire
        await new Promise((r) => setTimeout(r, makeConfig().polling.pollingPeriodShort + 100));

        expect(fetchedIds).toContain(2);

        sub.unsubscribe();
    });
});
