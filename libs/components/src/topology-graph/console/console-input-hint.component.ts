import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * States what the console does to keyboard and clipboard input before it reaches the session,
 * wherever that departs from what the keys say. Rendered inside the console's mouse-event element
 * and inert to the pointer, so the session receives clicks as if nothing were drawn over it.
 */
@Component({
    selector: 'crczp-console-input-hint',
    imports: [MatIconModule],
    templateUrl: './console-input-hint.component.html',
    styleUrl: './console-input-hint.component.scss',
})
export class ConsoleInputHint {
    /** Whether the session draws a desktop rather than a terminal. */
    graphical = input.required<boolean>();

    /** Whether the host platform shortcuts with Command, making its keys arrive rewritten. */
    commandKeyPlatform = input.required<boolean>();

    /** Whether pasting into the session takes a keystroke of its own. */
    clipboardGuidance = input.required<boolean>();

    /** Labels the host platform's paste modifier, the one the reader has to press. */
    protected readonly modifierLabel = computed(() =>
        this.commandKeyPlatform() ? 'Cmd' : 'Ctrl',
    );

    /** Labels the shift key the way the host platform's own keyboard does. */
    protected readonly shiftLabel = computed(() =>
        this.commandKeyPlatform() ? '⇧' : 'Shift',
    );
}
