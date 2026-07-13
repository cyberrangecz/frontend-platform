import { enrichRows, EnrichmentSpec } from './row-enricher';

const entity = { id: 1, name: 'alpha' };

function makeSpec(overrides: Partial<EnrichmentSpec> = {}): EnrichmentSpec {
    return {
        matchedField: 'instance_id',
        outputKey: 'instance',
        entityMap: new Map([[1, entity]]),
        safe: false,
        ...overrides,
    };
}

describe('enrichRows', () => {
    it('replaces id field with resolved entity', () => {
        const result = enrichRows([{ instance_id: 1, score: 100 }], [makeSpec()]);
        expect(result).toEqual([{ score: 100, instance: entity }]);
    });

    it('removes id field when entity missing in strict mode', () => {
        const result = enrichRows([{ instance_id: 1 }], [makeSpec({ entityMap: new Map() })]);
        expect(result).toEqual([{}]);
    });

    it('adds fallback object when entity missing in safe mode', () => {
        const result = enrichRows(
            [{ instance_id: 5 }],
            [makeSpec({ entityMap: new Map(), safe: true })],
        );
        expect(result).toEqual([{ instance: { instanceId: 5 } }]);
    });

    it('derives fallback key from outputKey', () => {
        const result = enrichRows(
            [{ training_run_id: 7 }],
            [makeSpec({ matchedField: 'training_run_id', outputKey: 'trainingRun', entityMap: new Map(), safe: true })],
        );
        expect(result).toEqual([{ trainingRun: { trainingRunId: 7 } }]);
    });

    it('skips row when id field value is not a number', () => {
        const row = { instance_id: 'not-a-number' };
        const result = enrichRows([row], [makeSpec()]);
        expect(result).toEqual([{ instance_id: 'not-a-number' }]);
    });

    it('applies multiple specs to single row', () => {
        const userEntity = { id: 2, email: 'a@b.com' };
        const specs: EnrichmentSpec[] = [
            makeSpec(),
            makeSpec({
                matchedField: 'user_ref_id',
                outputKey: 'user',
                entityMap: new Map([[2, userEntity]]),
            }),
        ];
        const result = enrichRows([{ instance_id: 1, user_ref_id: 2 }], specs);
        expect(result).toEqual([{ instance: entity, user: userEntity }]);
    });

    it('applies specs independently across multiple rows', () => {
        const entity2 = { id: 2, name: 'beta' };
        const spec = makeSpec({ entityMap: new Map([[1, entity], [2, entity2]]) });
        const result = enrichRows([{ instance_id: 1 }, { instance_id: 2 }], [spec]);
        expect(result).toEqual([{ instance: entity }, { instance: entity2 }]);
    });

    it('does not mutate original row objects', () => {
        const row = { instance_id: 1 };
        enrichRows([row], [makeSpec()]);
        expect(row).toEqual({ instance_id: 1 });
    });

    it('returns empty array for empty input', () => {
        expect(enrichRows([], [makeSpec()])).toEqual([]);
    });

    it('returns rows unchanged when specs array is empty', () => {
        const rows = [{ instance_id: 1 }];
        expect(enrichRows(rows, [])).toEqual([{ instance_id: 1 }]);
    });
});
