import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PALETTE, TraineeIdentityComponent } from '../shared';
import { emphasisFor, HighlightKind, isDimmed, TraineeHighlight } from './answer-faces';
import { TraineeIdentity, TraineeResult } from './assessment-view.model';
import {
    defaultSort,
    NUMERIC_COLUMNS,
    NumericKey,
    TRAINEE_COLUMNS,
    Sort,
    SortKey,
    traineeComparator,
    TraineeSortFields,
    traineeSortFields
} from './trainee-sort';

/** Placeholder shown for a column when the trainee did not answer. */
const ABSENT = '—';

/** ARIA sort state of a column header, mirroring `aria-sort`'s value set. */
type AriaSort = 'ascending' | 'descending' | 'none';

/**
 * Projects a set of columns into a record keyed by each column's `key`, typing
 * the result from the columns themselves so a narrowed or renamed column set
 * changes the record's key union rather than silently producing gaps.
 *
 * @param columns The columns to project, each contributing one record entry.
 * @param project Derives a column's record value.
 * @returns One entry per column, keyed by its `key`.
 */
function toColumnRecord<Columns extends readonly { readonly key: string }[], Value>(
    columns: Columns,
    project: (column: Columns[number]) => Value,
): { [Key in Columns[number]['key']]: Value } {
    return Object.fromEntries(columns.map((column) => [column.key, project(column)])) as {
        [Key in Columns[number]['key']]: Value;
    };
}

/**
 * Toggles the ordering by a column: sorting by the already-active column flips
 * its direction, otherwise the new column becomes active in ascending order.
 *
 * @param current The active ordering.
 * @param key The column to sort by.
 * @returns The resulting ordering.
 */
function toggledSort(current: Sort, key: SortKey): Sort {
    return current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
}

/**
 * Resolves a column header's `aria-sort` value from the active ordering.
 *
 * @param key The column to resolve the value for.
 * @param sort The active ordering.
 * @returns The column's `aria-sort` value.
 */
function ariaSortFor(key: SortKey, sort: Sort): AriaSort {
    return key === sort.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
}

/** One roster row: a trainee's identity, its sortable fields, and per-column cell text. */
interface TraineeRow extends TraineeSortFields {
    /** Training run identifier; the stable row key and focused-trainee-selection value. */
    readonly runId: number;
    /** Raw base64 avatar picture without a data-URL prefix; empty when none. */
    readonly picture: string;
    /** Numeric-column cell text keyed by sort key, or the placeholder when not answered. */
    readonly cells: Readonly<Record<NumericKey, string>>;
    /** Active highlight emphasis on this trainee, or null when not highlighted. */
    readonly emphasis: HighlightKind | null;
    /** Whether an answer highlight is active and this trainee is not among its choosers. */
    readonly dimmed: boolean;
}

/**
 * Aside roster of every trainee on the run, rendered as a sortable, selectable
 * table. Each row carries the trainee's result in the selected assessment:
 * points, whole-question correctness, and answered count. Column headers sort the
 * table (non-answered trainees pinned last on numeric columns), defaulting to the
 * assessment's natural order; clicking a row makes that trainee focused. A single
 * active highlight is shown exclusively: a common-answer selection emphasises its
 * choosers in blue and dims the rest, while with no answer selected the focused trainee
 * is emphasised in gold. Trainees who did not answer are shown muted.
 */
@Component({
    selector: 'crczp-trainee-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TraineeIdentityComponent, MatIconModule, MatTooltipModule],
    templateUrl: './trainee-list.component.html',
    styleUrl: './trainee-list.component.scss',
})
export class TraineeListComponent {
    /** Every trainee on the run, in the model's default order. */
    readonly trainees = input.required<readonly TraineeIdentity[]>();

    /** Per-run results of the selected assessment, or null when none is selected. */
    readonly results = input.required<ReadonlyMap<number, TraineeResult> | null>();

    /** Number of questions in the selected assessment, for the count columns. */
    readonly questionCount = input.required<number>();

    /** Whether the selected assessment is scored, seeding the default sort column. */
    readonly scored = input.required<boolean>();

    /** Run id of the focused trainee, or null when none is focused. */
    readonly focusedTraineeRunId = input.required<number | null>();

    /** The active trainee highlight, or null when nothing is highlighted. */
    readonly highlight = input<TraineeHighlight | null>(null);

    /** Emits the run id of the trainee whose row was clicked. */
    readonly focusedTraineeChange = output<number>();

    /** Left-bar colour of a focused-trainee-highlighted row. */
    protected readonly traineeBarColor = PALETTE.gold.color;

    /** Left-bar colour of an answer-chooser-highlighted row. */
    protected readonly answerBarColor = PALETTE.blue.color;

    /** Sortable column headers, in display order. */
    protected readonly columns = TRAINEE_COLUMNS;

    /** Numeric columns, driving the value cells per row. */
    protected readonly numericColumns = NUMERIC_COLUMNS;

    /** Active ordering; resets to the assessment default when the scored kind changes. */
    protected readonly sortState = linkedSignal<Sort>(() => defaultSort(this.scored()));

    /** Roster rows joined to the selected assessment's results, in model order. */
    private readonly rows = computed<readonly TraineeRow[]>(() => {
        const results = this.results();
        const questionCount = this.questionCount();
        const highlight = this.highlight();
        return this.trainees().map((trainee) => {
            const fields = traineeSortFields(trainee.name, results?.get(trainee.runId));
            const cells = toColumnRecord(this.numericColumns, (column) => {
                const value = fields.values[column.key];
                return value === null ? ABSENT : column.format(value, questionCount);
            });
            return {
                ...fields,
                runId: trainee.runId,
                picture: trainee.picture,
                cells,
                emphasis: emphasisFor(highlight, trainee.runId),
                dimmed: isDimmed(highlight, trainee.runId),
            };
        });
    });

    /** Roster rows in the active sort order. */
    protected readonly sortedRows = computed<readonly TraineeRow[]>(() =>
        [...this.rows()].sort(traineeComparator(this.sortState())),
    );

    /**
     * Toggles the ordering by a column: a new column sorts ascending, the active
     * column flips direction.
     *
     * @param key The column to sort by.
     */
    protected onSort(key: SortKey): void {
        this.sortState.update((current) => toggledSort(current, key));
    }

    /** ARIA sort state of every column header, keyed by column, for `aria-sort`. */
    protected readonly ariaSort = computed<ReadonlyMap<SortKey, AriaSort>>(() => {
        const sort = this.sortState();
        return new Map(
            this.columns.map((column): [SortKey, AriaSort] => [column.key, ariaSortFor(column.key, sort)]),
        );
    });
}
