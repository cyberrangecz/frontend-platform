import { Component, Input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'crczp-table-state-cell',
    standalone: true,
    imports: [MatIcon, MatTooltip],
    templateUrl: './table-state-cell.component.html',
    styleUrl: './table-state-cell.component.css',
})
export class TableStateCellComponent<T> {
    @Input({ required: true }) value: T;
    @Input() toString: (value: T) => string | null = (value: T) => value.toString();
    @Input() toIcon: (value: T) => string | null = (val: T) => null;
    @Input() color: string = 'primary';

    @Input() textDisplay: 'before' | 'after' | 'hidden' = 'after';
}
