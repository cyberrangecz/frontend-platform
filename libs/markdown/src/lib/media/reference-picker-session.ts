import { inject, Signal, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MediaReference } from '../model/markdown-blocks';
import { MaterialChoice, MaterialPickerComponent } from './material-picker.component';
import { MediaItemActions } from './media-item-actions';

/** What a picker session reads from the card that hosts the picker. */
export interface ReferencePickerSource {
    readonly reference: Signal<MediaReference>;
    readonly picker: Signal<MaterialPickerComponent | undefined>;
    /** The element that takes focus back when none was focused as the picker opened. */
    readonly fallbackFocus?: () => HTMLElement | null;
}

/**
 * The open state of the file picker of one media reference: it opens and closes the picker,
 * applies a pick or a changed label through the item actions, and returns focus to where the
 * picker was opened from. Construct it in the host's injection context.
 */
export class ReferencePickerSession {
    private readonly actions = inject(MediaItemActions, { optional: true });
    private readonly document = inject(DOCUMENT);
    private returnFocus: HTMLElement | null = null;

    /** Whether the picker is open. */
    readonly picking = signal(false);

    constructor(private readonly source: ReferencePickerSource) {}

    open(): void {
        const focused = this.document.activeElement;
        this.returnFocus = focused instanceof HTMLElement ? focused : (this.source.fallbackFocus?.() ?? null);
        this.picking.set(true);
    }

    toggle(): void {
        if (this.picking()) {
            this.source.picker()?.close();
        } else {
            this.open();
        }
    }

    /** Points the reference at the picked file and closes the picker. */
    picked(choice: MaterialChoice): void {
        this.picking.set(false);
        this.actions?.relink(this.source.reference(), choice.material, choice.label);
    }

    /** Closes the picker, keeping a changed label, which renders the card anew, or else handing focus back to where the picker was opened from. */
    closed(label: string): void {
        this.picking.set(false);
        if (label !== this.source.reference().label) {
            this.actions?.relabel(this.source.reference(), label);
        } else {
            this.returnFocus?.focus();
        }
    }
}
