import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormatTargetService } from './format-target.service';
import { FORMAT_ACTIONS, HEADING_ACTIONS, MarkdownFormatAction, tooltipOf } from './markdown-format-actions';

/** Elements that may hold focus while the editor they format stays open. */
export const FORMAT_TOOLBAR_FOCUS_SELECTOR = 'crczp-format-toolbar, .format-toolbar-menu';

/**
 * The formatting controls, acting on the editor the format target holds.
 * Pressing a control leaves the focus in that editor.
 */
@Component({
    selector: 'crczp-format-toolbar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
    templateUrl: './format-toolbar.component.html',
    styleUrl: './format-toolbar.component.scss',
    host: {
        role: 'toolbar',
        'aria-label': 'Formatting',
        '(mousedown)': '$event.preventDefault()',
    },
})
export class FormatToolbarComponent {
    protected readonly target = inject(FormatTargetService);

    protected readonly headings = HEADING_ACTIONS;
    protected readonly groups: readonly (readonly MarkdownFormatAction[])[] = [
        FORMAT_ACTIONS.slice(0, 3),
        FORMAT_ACTIONS.slice(3, 6),
        FORMAT_ACTIONS.slice(6, 9),
        FORMAT_ACTIONS.slice(9),
    ];
    protected readonly tooltipOf = tooltipOf;
}
