import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { pastesWithCommandKey } from './console-clipboard';

/**
 * Marks a console whose browser withholds unprompted clipboard reading, and explains what pasting
 * takes there and why. Rendered inside the console's mouse-event element, so the session receives
 * the pointer as if nothing were drawn over it.
 */
@Component({
    selector: 'crczp-console-clipboard-hint',
    imports: [MatIconModule],
    templateUrl: './console-clipboard-hint.component.html',
    styleUrl: './console-clipboard-hint.component.scss',
})
export class ConsoleClipboardHint {
    /** Labels the host platform's paste modifier, the one the reader has to press. */
    protected readonly pasteModifierLabel = pastesWithCommandKey()
        ? 'Cmd'
        : 'Ctrl';
}
