import { EntityRegistryEntry } from './entity-registry';

export interface CollectedIds {
    matchedField: string;
    ids: number[];
}

/**
 * Scans rows for the first DB column owned by the given registry entry,
 * deduplicates its numeric values, and returns them with the matched column name.
 * Returns null when no owned field is present in the rows or no numeric IDs are found.
 *
 * @param rows Source rows from a Drizzle query result.
 * @param entry Registry entry describing the entity type's owned DB columns.
 */
export function collectIds(
    rows: Record<string, unknown>[],
    entry: EntityRegistryEntry,
): CollectedIds | null {
    if (rows.length === 0) return null;

    const matchedField = entry.fields.find((f) => f in rows[0]);
    if (matchedField === undefined) return null;

    const ids = [
        ...new Set(
            rows.map((r) => r[matchedField]).filter((v): v is number => typeof v === 'number'),
        ),
    ];

    return ids.length > 0 ? { matchedField, ids } : null;
}
