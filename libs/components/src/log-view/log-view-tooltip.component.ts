import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Tooltip body of a log view toolbar button: the action, then its shortcut in a quieter row. */
@Component({
    selector: 'crczp-log-view-tooltip',
    templateUrl: './log-view-tooltip.component.html',
    styleUrl: './log-view-tooltip.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        role: 'tooltip',
        '[id]': 'id()',
    },
})
export class LogViewTooltip {
    readonly id = input.required<string>();
    readonly label = input.required<string>();
    readonly shortcut = input<string>();
}
