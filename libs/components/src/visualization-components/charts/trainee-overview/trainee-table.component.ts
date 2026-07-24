import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import {
    buildRankedComparator,
    byNumber,
    byText,
    chainComparators,
    ColumnComparators,
    Comparator,
    RunStateChipComponent,
    TraineeIdentityComponent,
} from '../shared';
import { TraineeRow } from './trainee-overview.model';
import { SortDir } from '@crczp/utils';

/** Rendered column identifiers for the trainee monitor table, in display order. */
const DISPLAYED_COLUMNS: readonly string[] = [
    'trainee',
    'currentTime',
    'currentLevel',
    'timeInLevel',
    'score',
];

/**
 * Lean, selectable live-monitor table: one row per trainee run with the
 * current-state metrics as sortable columns. Clicking a row emits its run id;
 * the currently selected row is highlighted.
 */
@Component({
    selector: 'crczp-trainee-table',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatTableModule,
        MatSortModule,
        RunStateChipComponent,
        TraineeIdentityComponent,
    ],
    templateUrl: './trainee-table.component.html',
    styleUrl: './trainee-table.component.scss',
})
export class TraineeTableComponent {
    /** Trainee rows to render, one per run. */
    readonly rows = input.required<readonly TraineeRow[]>();
    /** Run id of the currently selected row, or null when none is selected. */
    readonly selectedRunId = input<number | null>(null);
    /** Emits the run id of a row when the user selects it. */
    readonly rowSelect = output<number>();

    protected readonly displayedColumns = DISPLAYED_COLUMNS;

    /** Active column sort, defaulting to score descending; clear is disabled. */
    protected readonly sortState = signal<{ active: string; direction: SortDir }>({
        active: 'score',
        direction: 'desc',
    });

    /** Ascending comparator per sortable column, keyed by column identifier. */
    private readonly columnComparators: ColumnComparators<TraineeRow> = {
        trainee: byText((row) => row.name),
        currentTime: byNumber((row) => row.currentTimeMs),
        currentLevel: byNumber((row) => row.currentLevelOrder),
        timeInLevel: byNumber((row) => row.timeInLevelMs),
        score: byNumber((row) => row.scoreTotal),
    };

    /** Orders finished runs after running ones, independent of sort direction. */
    private readonly runningFirst: Comparator<TraineeRow> =
        byNumber((row) => (row.state === 'finished' ? 1 : 0));

    /**
     * Rows ordered by the active sort state. When sorting by current level,
     * finished runs are placed after running ones regardless of direction.
     */
    protected readonly sortedRows = computed<readonly TraineeRow[]>(() => {
        const sortState = this.sortState();
        const ranked = buildRankedComparator(this.columnComparators, {
            ...sortState,
            scoreColumn: 'score',
            durationColumn: 'currentTime',
        });
        const comparator = sortState.active === 'currentLevel'
            ? chainComparators(this.runningFirst, ranked)
            : ranked;
        return [...this.rows()].sort(comparator);
    });

    /**
     * Track-by identity for the row template, keyed by run id.
     *
     * @param _index Row index (unused).
     * @param row The trainee row being tracked.
     */
    protected readonly trackByRunId = (_index: number, row: TraineeRow): number => row.runId;

    /**
     * Writes the new sort state when a column header is activated. Empty
     * direction is treated as descending because clear is disabled.
     *
     * @param sort The sort event emitted by MatSort.
     */
    protected onSortChange(sort: Sort): void {
        this.sortState.set({ active: sort.active, direction: sort.direction || 'desc' });
    }
}
