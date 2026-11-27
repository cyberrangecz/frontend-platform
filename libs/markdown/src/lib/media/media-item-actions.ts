import { AttachmentMetadata } from '../attachment/attachment-source';
import { MediaReference } from '../model/markdown-blocks';

/** Which way the keyboard leaves a media card. */
export type FocusStep = 'previous' | 'next';

/** What a media card of an editable level offers, each acting on the block that holds the card. */
export abstract class MediaItemActions {
    /** Takes the card's reference out of the level. */
    abstract remove(reference: MediaReference): void;

    /** Points the card's reference at another stored file under a label. */
    abstract relink(reference: MediaReference, material: AttachmentMetadata, label: string): void;

    /** Gives the card's reference another label, keeping its file. */
    abstract relabel(reference: MediaReference, label: string): void;

    /** Saves a display width into the card's reference, or removes the saved width when none is given. */
    abstract resize(reference: MediaReference, maxWidth: number | undefined): void;

    /** Moves keyboard focus from the card to the card or block next to it. */
    abstract step(card: HTMLElement, direction: FocusStep): void;
}
