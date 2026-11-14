import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Floating pill of actions on one media card: replacing its file, resetting its saved size when the card is resizable, and removing it from the level. */
@Component({
    selector: 'crczp-media-toolbar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
    templateUrl: './media-toolbar.component.html',
    styleUrl: './media-toolbar.component.scss',
    host: { role: 'toolbar', 'aria-label': 'Attachment actions' },
})
export class MediaToolbarComponent {
    /** Whether the file picker the replace action opens is showing. */
    readonly replacing = input(false);
    /** Whether the card can be resized, which gives the toolbar its reset action. */
    readonly sizable = input(false);
    /** Whether the card has a saved size the reset action can remove. */
    readonly resettable = input(false);
    /** Requests the file picker that replaces the card's file, or its closing while it shows. */
    readonly replace = output<void>();
    /** Requests the removal of the card's saved size; emitted only while there is one. */
    readonly resetSize = output<void>();
    /** Requests the removal of the card from the level. */
    readonly remove = output<void>();
}
