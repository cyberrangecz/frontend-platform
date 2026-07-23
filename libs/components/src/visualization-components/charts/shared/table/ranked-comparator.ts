import { SortDir, Utils } from '@crczp/utils';

/** Two-argument ordering function suitable for `Array.prototype.sort`. */
export type Comparator<TRow> = (rowA: TRow, rowB: TRow) => number;

/** Map from a sortable column identifier to the comparator ordering that column ascending. */
export type ColumnComparators<TRow> = Readonly<Record<string, Comparator<TRow>>>;

/** Active column and direction of a table's sort state. */
export interface RankedSortConfig {
    /** Identifier of the currently active sort column. */
    readonly active: string;
    /** Sort direction of the active column. */
    readonly direction: SortDir;
    /** Identifier of the column that orders by score. */
    readonly scoreColumn: string;
    /** Identifier of the column that orders by run duration. */
    readonly durationColumn: string;
}

/**
 * Builds a comparator ordering rows ascending by the numeric value the selector returns.
 *
 * @template TRow The row type being compared.
 * @param select Extracts the number to order by.
 * @returns The ascending comparator.
 */
export function byNumber<TRow>(select: (row: TRow) => number): Comparator<TRow> {
    return (rowA, rowB) => select(rowA) - select(rowB);
}

/**
 * Builds a comparator ordering rows by the selected text under shared locale-aware collation
 * (case- and accent-insensitive, numeric-aware).
 *
 * @template TRow The row type being compared.
 * @param select Extracts the text to order by.
 * @returns The locale-aware comparator.
 */
export function byText<TRow>(select: (row: TRow) => string): Comparator<TRow> {
    return Utils.String.comparator(select);
}

/**
 * Inverts a comparator's ordering.
 *
 * @template TRow The row type being compared.
 * @param comparator The comparator to reverse.
 * @returns A comparator with the opposite order.
 */
export function reversed<TRow>(comparator: Comparator<TRow>): Comparator<TRow> {
    return (rowA, rowB) => -comparator(rowA, rowB);
}

/**
 * Combines comparators into one that returns the first non-zero result, resolving ties in order.
 *
 * @template TRow The row type being compared.
 * @param comparators Comparators applied in priority order.
 * @returns The composed comparator.
 */
export function chainComparators<TRow>(...comparators: readonly Comparator<TRow>[]): Comparator<TRow> {
    return (rowA, rowB) => {
        for (const comparator of comparators) {
            const result = comparator(rowA, rowB);
            if (result !== 0) return result;
        }
        return 0;
    };
}

/**
 * Composes a table comparator that orders by the active column, then resolves ties with a fixed
 * ranking convention: ties on the score column fall through to shorter run duration first, and ties
 * on any other column fall through to higher score first. The tiebreak is independent of the active
 * sort direction, so a shorter run and a higher score always win their tiebreak.
 *
 * @template TRow The row type being compared.
 * @param columns Ascending comparator per sortable column, keyed by column identifier.
 * @param config Active column, direction, and the score/duration column identifiers.
 * @returns The composed comparator.
 */
export function buildRankedComparator<TRow>(
    columns: ColumnComparators<TRow>,
    config: RankedSortConfig,
): Comparator<TRow> {
    const primary = columns[config.active] ?? (() => 0);
    const scoreOrder = columns[config.scoreColumn] ?? (() => 0);
    const durationOrder = columns[config.durationColumn] ?? (() => 0);
    const factor = config.direction === 'asc' ? 1 : -1;
    const tiebreak = config.active === config.scoreColumn ? durationOrder : reversed(scoreOrder);
    return chainComparators((rowA, rowB) => factor * primary(rowA, rowB), tiebreak);
}
