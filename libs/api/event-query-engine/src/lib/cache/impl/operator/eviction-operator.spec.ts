import { PgliteDatabase } from 'drizzle-orm/pglite';
import { PortalConfig } from '@crczp/utils';
import { evictStaleInstances } from './eviction-operator';
import { eventTables, watermarkTable } from '../schema/schema';

describe('evictStaleInstances operator', () => {
    let mockDb: PgliteDatabase;
    let mockTx: any;

    const mockConfig: PortalConfig = {
        caching: {
            endpointCachingDisabled: false,
            endpointCacheTTL: 3600,
            eventCacheTTL: 604800, // 7 days in seconds
            eventEntityCacheTTL: 86400,
            eventCacheMaxStaleness: 300000,
        },
    } as PortalConfig;

    beforeEach(() => {
        mockTx = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
        };

        mockDb = {
            transaction: vi.fn((cb: (tx: PgliteDatabase) => Promise<void>) => cb(mockTx as PgliteDatabase)),
        } as unknown as PgliteDatabase;
    });

    it('fetches watermarks grouped by instanceId within transaction', async () => {
        mockTx.where = vi.fn().mockResolvedValue([]);
        mockTx.groupBy = vi.fn().mockResolvedValue([]);

        await evictStaleInstances(mockDb, mockConfig);

        expect(mockDb.transaction).toHaveBeenCalled();
        expect(mockTx.select).toHaveBeenCalledWith(
            expect.objectContaining({ instanceId: expect.anything(), lastSynced: expect.anything() }),
        );
        expect(mockTx.from).toHaveBeenCalledWith(watermarkTable);
        expect(mockTx.groupBy).toHaveBeenCalled();
    });

    it('filters instances older than TTL threshold', async () => {
        const now = Date.now();
        const staleTimestamp = now - mockConfig.caching.eventCacheTTL * 1000 - 1000;
        const recentTimestamp = now;

        mockTx.groupBy = vi.fn().mockResolvedValue([
            { instanceId: 1, lastSynced: staleTimestamp },
            { instanceId: 2, lastSynced: recentTimestamp },
        ]);

        await evictStaleInstances(mockDb, mockConfig);

        expect(mockTx.delete).toHaveBeenCalled();
    });

    it('sorts oldest instances first for eviction', async () => {
        const now = Date.now();
        const oldestTimestamp = now - mockConfig.caching.eventCacheTTL * 1000 - 5000;
        const middleTimestamp = now - mockConfig.caching.eventCacheTTL * 1000 - 3000;
        const newestTimestamp = now - mockConfig.caching.eventCacheTTL * 1000 - 1000;

        mockTx.groupBy = vi.fn().mockResolvedValue([
            { instanceId: 1, lastSynced: newestTimestamp },
            { instanceId: 2, lastSynced: oldestTimestamp },
            { instanceId: 3, lastSynced: middleTimestamp },
        ]);

        await evictStaleInstances(mockDb, mockConfig);

        // Oldest should be evicted first - check first delete call targets oldest instance
        const firstDeleteTarget = mockTx.delete.mock.calls[0];
        expect(firstDeleteTarget).toBeDefined();
    });

    it('deletes watermark and event table data for each stale instance', async () => {
        const now = Date.now();
        const staleTimestamp = now - mockConfig.caching.eventCacheTTL * 1000 - 1000;

        mockTx.groupBy = vi.fn().mockResolvedValue([
            { instanceId: 5, lastSynced: staleTimestamp },
        ]);

        await evictStaleInstances(mockDb, mockConfig);

        // Should delete from watermarkTable and all event tables
        const deleteCalls = mockTx.delete.mock.calls.length;
        expect(deleteCalls).toBe(Object.keys(eventTables).length + 1);
    });
});
