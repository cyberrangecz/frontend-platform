import { InjectionToken, Type } from '@angular/core';
import { AttachmentKind } from '../attachment/attachment-kind';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { AudioMediaComponent } from './audio-media.component';
import { FileMediaComponent } from './file-media.component';
import { ImageMediaComponent } from './image-media.component';
import { InsetPolicy } from './inset-layout';
import { SizableCard } from './sizable-card-slot';
import { TextMediaComponent } from './text-media.component';
import { VideoMediaComponent } from './video-media.component';

/** The inputs the host hands every card; a resizable card also receives `maxWidth` while a width is saved or being resized. */
export interface CardInputs {
    readonly metadata: AttachmentMetadata | undefined;
    readonly label: string;
    readonly maxWidth?: number;
}

/** How the host lays out the frame around a card. */
export interface CardLayout {
    /** `fit` wraps the card's own width; `fill` stretches the frame to its column. */
    readonly width: 'fit' | 'fill';
    /** Whether the toolbar and the resize handle sit inside the card's area. */
    readonly inset: InsetPolicy;
    /** Whether the resize handle is lifted above a playback bar along the card's bottom edge. */
    readonly clearsPlaybackBar: boolean;
}

/** The layout of a card that declares none. */
export const DEFAULT_CARD_LAYOUT: CardLayout = { width: 'fit', inset: 'never', clearsPlaybackBar: false };

/**
 * The card rendering one attachment kind, with the frame layout it needs. A resizable card
 * satisfies {@link SizableCard}, which the host reads its widths through.
 */
export type AttachmentCard =
    | { readonly component: Type<unknown>; readonly layout?: Partial<CardLayout>; readonly resizable?: false }
    | { readonly component: Type<SizableCard>; readonly layout?: Partial<CardLayout>; readonly resizable: true };

/** The card rendering each attachment kind; a kind without an entry renders as a file card. */
export type AttachmentCards = Partial<Record<AttachmentKind, AttachmentCard>>;

const FILE_CARD: AttachmentCard = { component: FileMediaComponent };

/** Provide this token to add or replace the card, resizing and frame layout of a kind without changing the renderer. */
export const ATTACHMENT_CARDS = new InjectionToken<AttachmentCards>('ATTACHMENT_CARDS', {
    providedIn: 'root',
    factory: () => ({
        image: { component: ImageMediaComponent, resizable: true, layout: { inset: 'when-fits' } },
        audio: { component: AudioMediaComponent },
        video: { component: VideoMediaComponent, resizable: true, layout: { inset: 'always', clearsPlaybackBar: true } },
        text: { component: TextMediaComponent, layout: { width: 'fill' } },
        file: FILE_CARD,
    }),
});

/** The card a kind renders as: its entry, or the file card when it has none. */
export function cardOfKind(cards: AttachmentCards, kind: AttachmentKind): AttachmentCard {
    return cards[kind] ?? FILE_CARD;
}

/** The frame layout of a card: its declared traits over the defaults. */
export function layoutOfCard(card: AttachmentCard | null): CardLayout {
    return { ...DEFAULT_CARD_LAYOUT, ...card?.layout };
}
