import { Component, Input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'crczp-table-state-cell',
    templateUrl: './table-state-cell.component.html',
    styleUrl: './table-state-cell.component.css',
    imports: [MatIcon, MatTooltip],
})
export class TableStateCellComponent<T> {
    @Input({ required: true }) value: T;
    @Input() color = 'primary';
    @Input() textDisplay: 'before' | 'after' | 'hidden' = 'after';

    @Input() toString: (value: T) => string | null = (value: T) =>
        value.toString();

    @Input() toIcon: (value: T) => string | null = () => null;
}
