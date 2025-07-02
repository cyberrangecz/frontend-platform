import {Component, Input} from '@angular/core';

@Component({
    selector: 'crczp-table-state-cell',
    templateUrl: './table-state-cell.component.html',
    styleUrl: './table-state-cell.component.css',
})
export class TableStateCellComponent<T> {
    @Input({ required: true }) value: T;
    @Input() toString: (value: T) => string | null = (value: T) => value.toString();
    @Input() toIcon: (value: T) => string | null = () => null;
    @Input() color: string = 'primary';

    @Input() textDisplay: 'before' | 'after' | 'hidden' = 'after';
}
