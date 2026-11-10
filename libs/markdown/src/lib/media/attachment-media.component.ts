import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { DOCUMENT, NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, viewChild } from '@angular/core';
import { AttachmentFacts } from '../attachment/attachment-facts';
import { attachmentKindOf } from '../attachment/attachment-kind';
import { AttachmentSource } from '../attachment/attachment-source';
import { MediaReference } from '../model/markdown-blocks';
import { ATTACHMENT_CARDS, CardInputs, cardOfKind, layoutOfCard } from './attachment-cards';
import { CardSizing } from './card-sizing';
import { MaterialPickerComponent } from './material-picker.component';
import { MediaItemActions } from './media-item-actions';
import { MediaPlaceholderComponent } from './media-placeholder.component';
import { MediaResizeHandleComponent } from './media-resize-handle.component';
import { MediaSizeControlComponent } from './media-size-control.component';
import { MediaToolbarComponent } from './media-toolbar.component';
import { MissingMediaComponent } from './missing-media.component';
import { ReferencePickerSession } from './reference-picker-session';
import { SIZABLE_CARD_SLOT, SIZABLE_CARD_SLOT_PROVIDER } from './sizable-card-slot';

/** Below the toolbar's right end, else above it, else below its left end. */
const PICKER_POSITIONS: ConnectedPosition[] = [
    {
        originX: 'end',
        originY: 'bottom',
        overlayX: 'end',
        overlayY: 'top',
        offsetY: 4,
    },
    {
        originX: 'end',
        originY: 'top',
        overlayX: 'end',
        overlayY: 'bottom',
        offsetY: -4,
    },
    {
        originX: 'start',
        originY: 'bottom',
        overlayX: 'start',
        overlayY: 'top',
        offsetY: 4,
    },
];

/**
 * One attachment reference in the content. It reads the attachment's metadata through the
 * source, then hands it to the card component of its kind; while the metadata loads it shows a
 * placeholder, and when no file has the hash it shows the unavailable card. The host carries the
 * state as a class and a data attribute.
 *
 * Where media item actions are provided, the card is editable and one keyboard stop: Enter opens
 * the file picker, Delete or Backspace removes the card from the level, and the up and down
 * arrows move on to the neighbouring card or block. A toolbar on the card's top-right corner,
 * outside the tab order, offers replacing, removing and, for a resizable card, resetting its
 * size, which is disabled while no display width is saved; it shows while the pointer is over the
 * card, while keyboard focus is on or within it, and always on touch screens. A resizable card
 * also carries a corner handle that drags its display width up to the width of the column the
 * card sits in, beside a size readout that turns into a field for typing a width, which only the
 * card's own limits bound; a card keeps its minimum width in a narrower column and scrolls
 * sideways within it, the host carrying a class while it does.
 */
@Component({
    selector: 'crczp-attachment-media',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        NgComponentOutlet,
        CdkConnectedOverlay,
        CdkOverlayOrigin,
        CdkTrapFocus,
        MaterialPickerComponent,
        MediaPlaceholderComponent,
        MediaResizeHandleComponent,
        MediaSizeControlComponent,
        MediaToolbarComponent,
        MissingMediaComponent,
    ],
    providers: [SIZABLE_CARD_SLOT_PROVIDER],
    templateUrl: './attachment-media.component.html',
    styleUrl: './attachment-media.component.scss',
    host: {
        '[class]': '"attachment-media--" + state()',
        '[class.attachment-media--scrolling]': 'sizing.scrolling()',
        '[attr.data-state]': 'state()',
        '[attr.data-pending]': 'pending() || null',
        '[attr.role]': 'actions ? "group" : null',
        '[attr.tabindex]': 'actions ? 0 : null',
        '[attr.draggable]': 'actions ? "false" : null',
        '[attr.aria-label]': 'actions ? name() : null',
        '[attr.aria-keyshortcuts]': 'actions ? "Enter Delete" : null',
        '(keydown)': 'onKeydown($event)',
    },
})
export class AttachmentMediaComponent {
    private readonly source = inject(AttachmentSource);
    private readonly cards = inject(ATTACHMENT_CARDS);
    private readonly cardSlot = inject(SIZABLE_CARD_SLOT);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly document = inject(DOCUMENT);
    private readonly picker = viewChild(MaterialPickerComponent);
    private readonly missingCard = viewChild(MissingMediaComponent);
    private readonly frame = viewChild<ElementRef<HTMLElement>>('frame');
    private readonly insetProbe = viewChild<ElementRef<HTMLElement>>('insetProbe');

    protected readonly actions = inject(MediaItemActions, { optional: true });
    protected readonly pickerPositions = PICKER_POSITIONS;

    readonly reference = input.required<MediaReference>();

    private readonly facts = new AttachmentFacts(() => this.reference().hash);

    protected readonly found = this.facts.metadata;
    protected readonly failure = this.facts.failure;
    protected readonly kind = computed(() => {
        const found = this.found();
        return found && attachmentKindOf(found);
    });
    protected readonly state = computed(() => {
        if (this.facts.loading()) {
            return 'loading';
        }
        return this.found() ? 'ready' : 'unavailable';
    });
    protected readonly pending = computed(() => this.source.isPending(this.reference().hash));
    private readonly cardEntry = computed(() => {
        const kind = this.kind();
        return kind ? cardOfKind(this.cards, kind) : null;
    });
    protected readonly card = computed(() => this.cardEntry()?.component ?? null);
    protected readonly layout = computed(() => layoutOfCard(this.cardEntry()));
    /** Whether the card is declared resizable in the card registry, so a display width can be saved for it. */
    protected readonly sizable = computed(() => this.cardEntry()?.resizable === true);
    protected readonly sizing = new CardSizing({
        host: this.host,
        frame: this.frame,
        insetProbe: this.insetProbe,
        sizableCard: computed(() => (this.sizable() ? this.cardSlot() : null)),
        insetPolicy: computed(() => this.layout().inset),
        dimensions: computed(() => this.found() ?? {}),
    });
    protected readonly cardInputs = computed<CardInputs>(() => {
        const { label, maxWidth: savedWidth } = this.reference();
        const inputs = { metadata: this.found(), label };
        const maxWidth = this.sizing.previewWidth() ?? savedWidth;
        return this.sizable() && maxWidth ? { ...inputs, maxWidth } : inputs;
    });
    protected readonly name = computed(() => this.reference().label || this.found()?.fileName || 'Unnamed file');
    protected readonly pickerSession = new ReferencePickerSession({ reference: this.reference, picker: this.picker });

    protected retryFacts(): void {
        this.facts.retry();
    }

    protected onKeydown(event: KeyboardEvent): void {
        const actions = this.actions;
        if (!actions || event.target !== this.host) {
            return;
        }
        switch (event.key) {
            case 'Enter':
                this.openPicker();
                break;
            case 'Delete':
            case 'Backspace':
                actions.remove(this.reference());
                break;
            case 'ArrowUp':
                actions.step(this.host, 'previous');
                break;
            case 'ArrowDown':
                actions.step(this.host, 'next');
                break;
            default:
                return;
        }
        event.preventDefault();
    }

    /**
     * Saves a display width into the card's reference, or removes the saved width when none is
     * given. A width equal to the saved one changes nothing and hands focus held within the card
     * back to the card.
     */
    protected saveWidth(width: number | undefined): void {
        if (width !== this.reference().maxWidth) {
            this.actions?.resize(this.reference(), width);
        } else if (this.host.contains(this.document.activeElement)) {
            this.host.focus();
        }
    }

    private openPicker(): void {
        const missingCard = this.missingCard();
        if (missingCard) {
            missingCard.openPicker();
        } else {
            this.pickerSession.open();
        }
    }
}
