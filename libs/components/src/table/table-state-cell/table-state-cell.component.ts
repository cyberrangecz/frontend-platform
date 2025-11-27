import { Component, input } from '@angular/core';
import { Utils } from '@crczp/utils';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'crczp-table-state-cell',
    imports: [MatIcon, MatTooltip],
    templateUrl: './table-state-cell.component.html',
    styleUrl: './table-state-cell.component.css',
})
export class TableStateCellComponent {
    text = input.required();
    iconColor = input(Utils.Document.extractCssVariable('--primary-40'));
    icon = input<string | null>(null);
    textPosition = input<'before' | 'after' | 'hidden'>('after');
}
