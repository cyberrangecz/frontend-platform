import { DestroyRef, inject, InjectionToken, InputSignal, signal, Signal, WritableSignal } from '@angular/core';
import { MediaSizeLimits } from './media-size-limits';

/**
 * What a resizable media card offers the element hosting it: it takes the saved display width as
 * its `maxWidth` input, tells the widths it can be resized to and the width it is shown at, and
 * reports itself with {@link reportSizableCard} from its constructor. The card registry marks the
 * entries that must satisfy it.
 */
export interface SizableCard {
    /** The saved display width in CSS px, as the host passes it through the card inputs; undefined when none is saved. */
    readonly maxWidth: InputSignal<number | undefined>;
    /** The widths the card can be shown at; null while unknown. */
    readonly sizeLimits: Signal<MediaSizeLimits | null>;
    /** The width the card is shown at before any column cap; null while unknown. */
    readonly shownWidth: Signal<number | null>;
}

/** Holds the resizable card currently rendered by the element hosting it; null while there is none. */
export type SizableCardSlot = WritableSignal<SizableCard | null>;

/** Provided by the element that hosts a card, so a card can report itself to it as soon as it exists. */
export const SIZABLE_CARD_SLOT = new InjectionToken<SizableCardSlot>('SIZABLE_CARD_SLOT');

/** The provider that gives a card host its own empty slot. */
export const SIZABLE_CARD_SLOT_PROVIDER = { provide: SIZABLE_CARD_SLOT, useFactory: (): SizableCardSlot => signal(null) };

/** Reports a card to the slot of its host, if any, and clears the slot again when the card is destroyed. Called in the card's injection context. */
export function reportSizableCard(card: SizableCard): void {
    const slot = inject(SIZABLE_CARD_SLOT, { optional: true });
    if (!slot) {
        return;
    }
    slot.set(card);
    inject(DestroyRef).onDestroy(() => slot.update((current) => (current === card ? null : current)));
}
