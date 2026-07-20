import { byNumber, byText, chainComparators, Comparator, reversed } from '../shared';
import { TraineeResult } from './assessment-view.model';
import { SortDir } from '@crczp/utils';

/**
 * One numeric roster column: how it sorts (its value selector) and how its cell
 * text reads. The single source describing the numeric columns; the sort keys,
 * comparators, headers, and cell text all derive from this table.
 */
interface NumericColumn {
    /** Column identifier and sort key. */
    readonly key: string;
    /** Short header label. */
    readonly label: string;
    /** Full header tooltip. */
    readonly title: string;
    /** Fixed column width, sized to fit the short header label and its sort arrow. */
    readonly width: string;
    /** Extracts the sortable value from an answered trainee's result. */
    readonly select: (result: TraineeResult) => number;
    /** Formats the cell text from the selected value and the assessment's question count. */
    readonly format: (value: number, questionCount: number) => string;
}

/** The numeric roster columns, in display order. */
export const NUMERIC_COLUMNS = [
    {
        key: 'points',
        label: 'Pts',
        title: 'Points gained',
        width: '4.5rem',
        select: (result: TraineeResult): number => result.points,
        format: (value: number, _questionCount: number): string => String(value),
    },
    {
        key: 'correct',
        label: 'Correct',
        title: 'Whole questions correct',
        width: '5.25rem',
        select: (result: TraineeResult): number => result.correctCount,
        format: (value: number, questionCount: number): string => `${value}/${questionCount}`,
    },
    {
        key: 'answered',
        label: 'Answered',
        title: 'Questions answered',
        width: '5.75rem',
        select: (result: TraineeResult): number => result.answeredCount,
        format: (value: number, questionCount: number): string => `${value}/${questionCount}`,
    },
] as const satisfies readonly NumericColumn[];

/** Sort key of a numeric roster column. */
export type NumericKey = (typeof NUMERIC_COLUMNS)[number]['key'];

/** Column the roster can be ordered by: the name column or any numeric column. */
export type SortKey = 'name' | NumericKey;

/** One roster header: its sort key, labels, and whether it is a numeric column. */
export interface RosterHeader {
    /** Sort key the header orders by. */
    readonly key: SortKey;
    /** Short header label. */
    readonly label: string;
    /** Full header tooltip. */
    readonly title: string;
    /** Whether the column holds a right-aligned numeric value. */
    readonly numeric: boolean;
}

/** Every roster header, in display order: the name column then the numeric columns. */
export const TRAINEE_COLUMNS: readonly RosterHeader[] = [
    { key: 'name', label: 'Trainee', title: 'Trainee name', numeric: false },
    ...NUMERIC_COLUMNS.map((column): RosterHeader => ({
        key: column.key,
        label: column.label,
        title: column.title,
        numeric: true,
    })),
];

/** Active roster ordering: a column and a direction. */
export interface Sort {
    /** Column the rows are ordered by. */
    readonly key: SortKey;
    /** Direction of the ordering. */
    readonly dir: SortDir;
}

/** The fields the trainee comparators read from a row. */
export interface TraineeSortFields {
    /** Trainee display name; the name-column key and the universal tiebreak. */
    readonly name: string;
    /** Whether the trainee answered the assessment; non-answered sort last on numeric columns. */
    readonly hasAnswered: boolean;
    /** Numeric column values keyed by sort key; null for a column when not answered. */
    readonly values: Readonly<Record<NumericKey, number | null>>;
}

/** Orders non-answered trainees after answered ones, independent of sort direction. */
const answeredFirst: Comparator<TraineeSortFields> = (first, second) =>
    Number(!first.hasAnswered) - Number(!second.hasAnswered);

/** Orders by trainee name, case- and accent-insensitively. */
const byName: Comparator<TraineeSortFields> = byText((fields) => fields.name);

/**
 * The default ordering for an assessment: highest score first for a scored
 * assessment, otherwise most answered first.
 *
 * @param scored Whether the assessment is scored.
 * @returns The default sort.
 */
export function defaultSort(scored: boolean): Sort {
    return scored ? { key: 'points', dir: 'desc' } : { key: 'answered', dir: 'desc' };
}

/**
 * Builds the roster comparator for a sort. Numeric columns keep non-answered
 * trainees pinned last regardless of direction, and every ordering resolves ties
 * by name.
 *
 * @param sort The active column and direction.
 * @returns The row comparator.
 */
export function traineeComparator(sort: Sort): Comparator<TraineeSortFields> {
    if (sort.key === 'name') {
        return sort.dir === 'desc' ? reversed(byName) : byName;
    }
    const key = sort.key;
    const ascending = byNumber<TraineeSortFields>((fields) => fields.values[key] ?? 0);
    const directed = sort.dir === 'desc' ? reversed(ascending) : ascending;
    return chainComparators(answeredFirst, directed, byName);
}

/**
 * Extracts the sortable fields of a trainee from its result.
 *
 * @param name Trainee display name.
 * @param result The trainee's result, or undefined when it did not answer.
 * @returns The comparator-ready fields.
 */
export function traineeSortFields(name: string, result: TraineeResult | undefined): TraineeSortFields {
    const values = Object.fromEntries(
        NUMERIC_COLUMNS.map((column) => [column.key, result?.hasAnswered ? column.select(result) : null]),
    ) as Record<NumericKey, number | null>;
    return { name, hasAnswered: result?.hasAnswered ?? false, values };
}
