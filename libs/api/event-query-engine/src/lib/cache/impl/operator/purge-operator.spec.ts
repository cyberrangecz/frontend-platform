import { PgliteDatabase } from 'drizzle-orm/pglite';
import { purge } from './purge-operator';
import { eventTables, watermarkTable } from '../schema/schema';

describe('purge operator', () => {
    let mockDb: PgliteDatabase;
    let mockTx: any;

    beforeEach(() => {
        mockTx = {
            delete: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([]),
        };

        mockDb = {
            transaction: vi.fn((cb: (tx: PgliteDatabase) => Promise<void>) => cb(mockTx as PgliteDatabase)),
        } as unknown as PgliteDatabase;
    });

    it('deletes from watermarkTable within transaction', async () => {
        await purge(mockDb, 1);

        expect(mockDb.transaction).toHaveBeenCalled();
        expect(mockTx.delete).toHaveBeenCalledWith(watermarkTable);
    });

    it('deletes from all event tables within transaction', async () => {
        await purge(mockDb, 1);

        const deleteCalls = mockTx.delete.mock.calls;
        expect(deleteCalls.length).toBe(Object.keys(eventTables).length + 1); // +1 for watermark
    });

    it('all deletes are scoped to target instanceId', async () => {
        await purge(mockDb, 42);

        const allWhereCalls = mockTx.where.mock.calls;
        for (const whereCall of allWhereCalls) {
            const sqlObj = whereCall[0] as any;
            const chunks = sqlObj.queryChunks;
            expect(chunks).toContainEqual(expect.objectContaining({ name: 'instance_id' }));
            expect(chunks).toContainEqual(expect.objectContaining({ value: 42 }));
        }
    });

    it('executes all operations within a single transaction', async () => {
        await purge(mockDb, 1);

        expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });
});
