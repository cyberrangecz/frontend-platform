import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PanelPlaceholderComponent } from '../../visualization-components/charts/shared/panel/panel-placeholder.component';

/**
 * Table row carrying a single cell that spans the full width of its table and states
 * that there is nothing to display. Rendered as a `tr` so it participates in the table
 * layout of the table it is placed in, directly beneath the header row.
 */
@Component({
    selector: 'tr[crczpTableEmptyRow]',
    imports: [PanelPlaceholderComponent],
    templateUrl: './table-empty-row.component.html',
    styleUrl: './table-empty-row.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableEmptyRowComponent {
    /** Sentence naming what the table would list if it held anything. */
    readonly message = input.required<string>();

    /** Number of columns the cell spans; matches the columns the table displays. */
    readonly columnCount = input.required<number>();
}
