import { collectIds } from './id-collector';
import { EntityRegistryEntry } from './entity-registry';

const runEntry: EntityRegistryEntry = {
    fields: ['training_run_id'],
    outputKey: 'trainingRun',
    idField: 'id',
};

const instanceEntry: EntityRegistryEntry = {
    fields: ['instance_id', 'training_instance_id'],
    outputKey: 'instance',
    idField: 'id',
};

describe('collectIds', () => {
    it('returns null for empty rows', () => {
        expect(collectIds([], runEntry)).toBeNull();
    });

    it('returns null when no owned field present in rows', () => {
        expect(collectIds([{ unrelated: 1 }], runEntry)).toBeNull();
    });

    it('returns null when matched field has no numeric values', () => {
        expect(collectIds([{ training_run_id: 'not-a-number' }], runEntry)).toBeNull();
    });

    it('returns null when matched field values are all null', () => {
        expect(collectIds([{ training_run_id: null }, { training_run_id: null }], runEntry)).toBeNull();
    });

    it('collects single numeric id', () => {
        expect(collectIds([{ training_run_id: 5 }], runEntry)).toEqual({
            matchedField: 'training_run_id',
            ids: [5],
        });
    });

    it('deduplicates ids across rows', () => {
        const rows = [{ training_run_id: 1 }, { training_run_id: 2 }, { training_run_id: 1 }];
        expect(collectIds(rows, runEntry)).toEqual({ matchedField: 'training_run_id', ids: [1, 2] });
    });

    it('filters non-numeric values mixed with numeric', () => {
        const rows = [{ training_run_id: 1 }, { training_run_id: null }, { training_run_id: 2 }];
        expect(collectIds(rows, runEntry)).toEqual({ matchedField: 'training_run_id', ids: [1, 2] });
    });

    it('picks first owned field found in row', () => {
        expect(collectIds([{ instance_id: 7 }], instanceEntry)).toEqual({
            matchedField: 'instance_id',
            ids: [7],
        });
    });

    it('falls back to second owned field when first is absent', () => {
        expect(collectIds([{ training_instance_id: 3 }], instanceEntry)).toEqual({
            matchedField: 'training_instance_id',
            ids: [3],
        });
    });

    it('uses first field found in rows[0] regardless of later rows', () => {
        const rows = [{ instance_id: 1 }, { instance_id: 2, training_instance_id: 99 }];
        const result = collectIds(rows, instanceEntry);
        expect(result?.matchedField).toBe('instance_id');
    });

    it('prefers the first owned field in fields order when several are present in the same row', () => {
        const rows = [{ instance_id: 1, training_instance_id: 99 }];
        const result = collectIds(rows, instanceEntry);
        expect(result?.matchedField).toBe('instance_id');
    });
});
