import { PgliteDatabase } from 'drizzle-orm/pglite';
import { getWatermarks } from './watermark-query-operator';
import { watermarkTable } from '../schema/schema';

describe('getWatermarks operator', () => {
    let mockDb: any;

    beforeEach(() => {
        mockDb = {
            select: vi.fn().mockReturnThis(),
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
        };
    });

    it('returns empty array when eventTypes is empty', async () => {
        const result = await getWatermarks(mockDb, 1, []);
        expect(result).toEqual([]);
        expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('queries watermarkTable with correct table reference', async () => {
        mockDb.where = vi.fn().mockResolvedValue([]);

        await getWatermarks(mockDb, 42, ['TrainingRunStarted']);

        expect(mockDb.select).toHaveBeenCalledWith();
        expect(mockDb.from).toHaveBeenCalledWith(watermarkTable);
    });

    it('applies where clause scoped to instanceId', async () => {
        mockDb.where = vi.fn().mockResolvedValue([]);

        await getWatermarks(mockDb, 99, ['TrainingRunStarted']);

        expect(mockDb.where).toHaveBeenCalledWith(expect.anything());
    });

    it('returns array of WatermarkEntry objects', async () => {
        const dbRows = [
            { instance_id: 1, event_type: 'TrainingRunStarted', max_timestamp: 1000, last_synced: 5000 },
            { instance_id: 1, event_type: 'LevelStarted', max_timestamp: 2000, last_synced: 6000 },
        ];
        mockDb.where = vi.fn().mockResolvedValue(dbRows);

        const result = await getWatermarks(mockDb, 1, ['TrainingRunStarted', 'LevelStarted']);

        expect(result).toEqual([
            { instanceId: 1, eventType: 'TrainingRunStarted', maxTimestamp: 1000, lastSynced: 5000 },
            { instanceId: 1, eventType: 'LevelStarted', maxTimestamp: 2000, lastSynced: 6000 },
        ]);
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
