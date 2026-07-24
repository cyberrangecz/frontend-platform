// @vitest-environment node
import { TestBed } from '@angular/core/testing';
import { PlatformEventType } from '@crczp/visualization-model';
import { eq } from 'drizzle-orm';
import { firstValueFrom, from, Observable, of, toArray } from 'rxjs';
import { signal } from '@angular/core';

import { ErrorHandlerService, PortalConfig } from '@crczp/utils';
import { LinearTrainingInstanceApi } from '@crczp/training-api';
import { applyNodeTestEnvironment, provideTestPortalConfig } from '@crczp/test-utils';

import { CacheService, EventCacheDb, RawEventRow } from '../cache/cache.interface';
import { insert } from '../cache/impl/operator/insert-operator';
import { commandTable, trainingRunStartedTable, watermarkTable } from '../cache/impl/schema/schema';
import { mapToRawEventRows } from '../sync/event-row-mapper';
import { provideEventBroker } from '../broker/provide-event-broker';
import { SyncService } from '../sync/impl/sync.service';
import { EventFetchApi, EventFetchParams } from '../sync/event-fetch-api';
import { DataBrokerServiceImpl } from '../broker/impl/broker.service';
import { makeCacheDb, TestCacheDb } from './sqlite-test-db';

process.env.TZ = 'America/New_York';

applyNodeTestEnvironment();

const openCaches: TestCacheDb[] = [];

async function createWorkerDb(): Promise<EventCacheDb> {
    const cache = await makeCacheDb();
    openCaches.push(cache);
    return cache.db;
}

afterEach(() => {
    while (openCaches.length) {
        openCaches.pop()!.close();
    }
});

/**
 * Default polling overrides shared by the integration suite.
 * Short polling keeps the tests fast; everything else inherits the production-like
 * defaults from `provideTestPortalConfig`.
 */
const DEFAULT_TEST_OVERRIDES = {
    polling: {
        pollingPeriodShortMs: 200,
        pollingPeriodLongMs: 5000,
        retryCount: 0,
    },
} as const;

/**
 * Resolved {@link PortalConfig} value used by TestBed providers via
 * {@link TEST_PORTAL_CONFIG_PROVIDER}.
 *
 * @param eventCacheTtlMs Override for `caching.eventCacheTtlMs`.
 * @param eventCacheMaxSizeBytes Override for `caching.eventCacheMaxSizeBytes`.
 */
function makeConfig(eventCacheTtlMs = 7 * 24 * 3_600_000, eventCacheMaxSizeBytes = 524_288_000): PortalConfig {
    const provider = provideTestPortalConfig({
        ...DEFAULT_TEST_OVERRIDES,
        caching: {
            eventCacheTtlMs,
            eventCacheMaxSizeBytes,
        },
    }) as { useValue: PortalConfig };
    return provider.useValue;
}

/** Provider form for TestBed `providers` arrays, sharing the same default overrides. */
const TEST_PORTAL_CONFIG_PROVIDER = provideTestPortalConfig(DEFAULT_TEST_OVERRIDES);

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
// MAPPER → INSERT → QUERY — real wire DTOs through the production mapper into SQLite
// Wire shapes follow the backend contract for GET /training-instances/{id}/events.
// ─────────────────────────────────────────────────────────────────────────────

describe('Wire DTO → mapper → insert → query against real SQLite', () => {
    let db: EventCacheDb;

    beforeEach(async () => {
        db = await createWorkerDb();
    });

    it('stores a COMMAND wire DTO in the command table with snake_case columns preserved', async () => {
        const commandDto: Record<string, unknown> = {
            type: null,
            timestamp: '2021-03-24T12:00:00',
            sandbox_id: 'sb-cmd',
            training_time: 12.5,
            cmd_type: 'bash',
            command: 'ls',
            command_arguments: '-la /root',
            hostname: 'attacker',
            username: 'root',
            wd: '/root',
            ip: '10.0.0.1',
        };

        const rows = mapToRawEventRows([commandDto], PlatformEventType.COMMAND, 1);
        await insert(db, rows);

        const stored = await (db as any).select().from(commandTable);

        expect(stored).toHaveLength(1);
        expect(stored[0].type).toBe(PlatformEventType.COMMAND);
        expect(stored[0].command).toBe('ls');
        expect(stored[0].command_arguments).toBe('-la /root');
        expect(stored[0].cmd_type).toBe('bash');
        expect(stored[0].hostname).toBe('attacker');
        expect(stored[0].username).toBe('root');
        expect(stored[0].wd).toBe('/root');
        expect(stored[0].ip).toBe('10.0.0.1');
        expect(stored[0].sandbox_id).toBe('sb-cmd');
    });

    it('parses offset-free LocalDateTime as UTC epoch regardless of runner timezone', async () => {
        const trainingDto: Record<string, unknown> = {
            type: 'training_run_started',
            timestamp: '2021-03-24T12:00:00',
            sandbox_id: 'sb-1',
            pool_id: 10,
            training_definition_id: 20,
            training_instance_id: 1,
            training_run_id: 100,
            level: 5,
            user_ref_id: 7,
            training_time: 500,
            level_order: 1,
            actual_score_in_level: 0,
            total_training_level_score: 100,
            total_assessment_level_score: 0,
        };

        const rows = mapToRawEventRows([trainingDto], PlatformEventType.TRAINING_RUN_STARTED, 1);
        await insert(db, rows);

        const [stored] = await (db as any).select().from(trainingRunStartedTable);

        expect(stored.timestamp).toBe(Date.UTC(2021, 2, 24, 12, 0, 0));
        expect(stored.timestamp).toBe(1616587200000);
    });

    it('persists training_time as a fractional JS number, not a string or truncated integer', async () => {
        const trainingDto: Record<string, unknown> = {
            type: 'training_run_started',
            timestamp: '2021-03-24T12:00:00',
            sandbox_id: 'sb-1',
            pool_id: 10,
            training_definition_id: 20,
            training_instance_id: 1,
            training_run_id: 100,
            level: 5,
            user_ref_id: 7,
            training_time: 90.5,
            level_order: 1,
            actual_score_in_level: 0,
            total_training_level_score: 100,
            total_assessment_level_score: 0,
        };

        const rows = mapToRawEventRows([trainingDto], PlatformEventType.TRAINING_RUN_STARTED, 1);
        await insert(db, rows);

        const [stored] = await (db as any).select().from(trainingRunStartedTable);

        expect(typeof stored.training_time).toBe('number');
        expect(stored.training_time).toBe(90.5);
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
                provideEventBroker(dbPromise),
                TEST_PORTAL_CONFIG_PROVIDER,
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
        const cacheService = TestBed.inject(CacheService);

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

    it('delta sync: existing watermark yields a sinceTimestamp within the synced range (overlap, no exact offset)', async () => {
        mockFetch.fetch.mockReturnValue(of([]));
        const cacheService = TestBed.inject(CacheService);
        const syncService = TestBed.inject(SyncService);

        await firstValueFrom(
            cacheService.insert([makeRow({ id: 'seed', timestamp: 5000 })]),
        );

        // Make the watermark stale so sync actually fetches
        await firstValueFrom(
            cacheService.query((handle: any): Observable<any[]> =>
                from<any[]>(
                    handle
                        .update(watermarkTable)
                        .set({ last_synced: Date.now() - 60000 })
                        .where(eq(watermarkTable.instance_id, 1)),
                ),
            ),
        );

        await firstValueFrom(
            syncService.sync({
                instanceId: 1,
                eventTypes: [PlatformEventType.TRAINING_RUN_STARTED],
            }),
        );

        const call = mockFetch.fetch.mock.calls[0][0] as EventFetchParams;
        expect(call.sinceTimestamp).toBeGreaterThanOrEqual(0);
        expect(call.sinceTimestamp).toBeLessThanOrEqual(5000);
    });

    it('fresh watermark (within 1 s) skips fetch entirely and still emits SyncTableComplete', async () => {
        mockFetch.fetch.mockReturnValue(of([]));
        const cacheService = TestBed.inject(CacheService);
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

    it('emits one SyncTableComplete per declared type regardless of completion order', async () => {
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
        expect(completions.map((c) => c.eventType).sort()).toEqual(
            [PlatformEventType.TRAINING_RUN_STARTED, PlatformEventType.LEVEL_STARTED].sort(),
        );
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
                provideEventBroker(dbPromise),
                TEST_PORTAL_CONFIG_PROVIDER,
                { provide: EventFetchApi, useValue: mockFetch },
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
        const cacheService = TestBed.inject(CacheService);
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

    // Polling tests run on real timers with a short polling interval; the async cache
    // pipeline needs wall-clock time between ticks.
    it('queryPolling(): emits on first tick then again after interval elapses', async () => {
        const broker = TestBed.inject(DataBrokerServiceImpl);
        const intervalMs = makeConfig().polling.pollingPeriodShortMs;
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
        await new Promise((r) => setTimeout(r, makeConfig().polling.pollingPeriodShortMs * 5));

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
        await new Promise((r) => setTimeout(r, makeConfig().polling.pollingPeriodShortMs + 100));

        expect(fetchedIds).toContain(2);

        sub.unsubscribe();
    });
});
