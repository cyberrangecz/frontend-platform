import { PgliteDatabase } from 'drizzle-orm/pglite';
import { PlatformEventType } from '@crczp/visualization-model';
import { insert } from './insert-operator';
import { RawEventRow } from '../../cache.interface';
import { eventTables, watermarkTable } from '../schema/schema';

describe('insert operator', () => {
    let mockDb: PgliteDatabase;
    let mockTx: any;

    beforeEach(() => {
        mockTx = {
            insert: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            onConflictDoNothing: vi.fn().mockResolvedValue([]),
            onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        };

        mockDb = {
            transaction: vi.fn((cb: (tx: PgliteDatabase) => Promise<void>) => cb(mockTx as PgliteDatabase)),
        } as unknown as PgliteDatabase;
    });

    it('returns early when rows array is empty', async () => {
        await insert(mockDb, []);
        expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('inserts rows grouped by event type into correct tables', async () => {
        const rows: RawEventRow[] = [
            { id: 'evt-1', type: 'TrainingRunStarted', timestamp: 1000, instance_id: 1 },
            { id: 'evt-2', type: 'TrainingRunStarted', timestamp: 2000, instance_id: 1 },
            { id: 'evt-3', type: 'LevelStarted', timestamp: 1500, instance_id: 1 },
        ];

        await insert(mockDb, rows);

        expect(mockTx.insert).toHaveBeenCalledWith(eventTables[PlatformEventType.TRAINING_RUN_STARTED]);
        expect(mockTx.insert).toHaveBeenCalledWith(eventTables[PlatformEventType.LEVEL_STARTED]);
    });

    it('normalizes rows before insert ensuring all required fields present', async () => {
        const rows: RawEventRow[] = [
            { id: 'evt-1', type: 'TrainingRunStarted', timestamp: 1000, instance_id: 1, extra_field: 'value' },
        ];

        await insert(mockDb, rows);

        expect(mockTx.insert).toHaveBeenCalled();
        expect(mockTx.values).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'evt-1',
                type: 'TrainingRunStarted',
                timestamp: 1000,
                instance_id: 1,
                extra_field: 'value',
            }),
        );
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

    it('uses onConflictDoNothing for deduplication by id', async () => {
        const rows: RawEventRow[] = [
            { id: 'evt-dupe', type: 'TrainingRunStarted', timestamp: 1000, instance_id: 1 },
            { id: 'evt-dupe', type: 'TrainingRunStarted', timestamp: 2000, instance_id: 1 },
        ];

        await insert(mockDb, rows);

        expect(mockTx.onConflictDoNothing).toHaveBeenCalled();
    });

    it('calculates max_timestamp correctly for watermark upsert', async () => {
        const rows: RawEventRow[] = [
            { id: 'evt-1', type: 'TrainingRunStarted', timestamp: 500, instance_id: 1 },
            { id: 'evt-2', type: 'TrainingRunStarted', timestamp: 3000, instance_id: 1 },
            { id: 'evt-3', type: 'TrainingRunStarted', timestamp: 1500, instance_id: 1 },
        ];

        await insert(mockDb, rows);

        expect(mockTx.insert).toHaveBeenCalledWith(watermarkTable);
        expect(mockTx.values).toHaveBeenCalledWith(
            expect.objectContaining({
                instance_id: 1,
                event_type: 'TrainingRunStarted',
                max_timestamp: 3000,
            }),
        );
    });
});
