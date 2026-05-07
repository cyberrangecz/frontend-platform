export interface EnrichmentSpec {
    matchedField: string;
    outputKey: string;
    entityMap: Map<number, unknown>;
    safe: boolean;
}

/**
 * Removes matched ID fields from each row and inserts the resolved entity under outputKey.
 * In safe mode, entity IDs absent from the map are replaced with `{ <outputKey>Id: number }`.
 * Original row objects are not mutated — each enriched row is a shallow copy.
 *
 * @param rows Source rows to enrich.
 * @param specs One spec per resolved entity type, produced by the batch fetch step.
 */
export function enrichRows(
    rows: Record<string, unknown>[],
    specs: EnrichmentSpec[],
): Record<string, unknown>[] {
    return rows.map((row) => {
        const enriched: Record<string, unknown> = { ...row };
        for (const { matchedField, outputKey, entityMap, safe } of specs) {
            const id = enriched[matchedField];
            if (typeof id !== 'number') continue;

            delete enriched[matchedField];

            const entity = entityMap.get(id);
            if (entity !== undefined) {
                enriched[outputKey] = entity;
            } else if (safe) {
                enriched[outputKey] = { [`${outputKey}Id`]: id };
            }
        }
        return enriched;
    });
}
