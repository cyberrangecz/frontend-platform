import { afterNextRender, computed, DestroyRef, effect, ElementRef, inject, linkedSignal, signal, Signal } from '@angular/core';
import { InsetPolicy, isInset } from './inset-layout';
import { capToColumn, clampWidth, heightPerWidthOf, MediaDimensions, MeasuredSize } from './media-size-limits';
import { observeBoxSize, observeColumnWidth } from './observe-box-size';
import { SizableCard } from './sizable-card-slot';

/** What a card's sizing reads from the element hosting the card. */
export interface CardSizingSource {
    readonly host: HTMLElement;
    /** The frame around the card; undefined while it is not rendered. */
    readonly frame: Signal<ElementRef<HTMLElement> | undefined>;
    /** The hidden box whose size is the smallest shown size that has room for the inset layout. */
    readonly insetProbe: Signal<ElementRef<HTMLElement> | undefined>;
    /** The resizable card in the frame; null for any other card. */
    readonly sizableCard: Signal<SizableCard | null>;
    readonly insetPolicy: Signal<InsetPolicy>;
    readonly dimensions: Signal<MediaDimensions>;
}

/**
 * The size state of one card host: what the frame is shown at, the column it sits in, the widths
 * the card may take within that column, the resize preview and the inset decision that follows
 * the shown size. Construct it in the host's injection context.
 */
export class CardSizing {
    /** The width a resize in progress has reached, shown in place of the saved one; null while none is in progress. */
    readonly previewWidth = signal<number | null>(null);

    private readonly shownSize = signal<MeasuredSize | null>(null);
    /** The shown size the card layout follows: it holds its value while a resize is in progress. */
    private readonly layoutSize = linkedSignal<{ size: MeasuredSize | null; resizing: boolean }, MeasuredSize | null>({
        source: computed(() => ({ size: this.shownSize(), resizing: this.previewWidth() !== null })),
        computation: ({ size, resizing }, previous) => (resizing && previous ? previous.value : size),
    });
    private readonly insetMinimum = signal<MeasuredSize | null>(null);
    private readonly columnWidth = signal<number | null>(null);

    /** Whether the card shares its area with the toolbar and the resize handle, which otherwise sit outside its corners. */
    readonly inset = computed(() => isInset(this.source.insetPolicy(), this.layoutSize(), this.insetMinimum()));
    /** The widths the resizable card may be shown at, whatever its column; null for any other card or while they are unknown. */
    readonly cardLimits = computed(() => this.source.sizableCard()?.sizeLimits() ?? null);
    /** The narrowest width the resizable card can be shown at; null for any other card or while it is unknown. */
    readonly minimumWidth = computed(() => this.cardLimits()?.minimum ?? null);
    /** The widths the resizable card may be resized to within its column; null for any other card or while they are unknown. */
    readonly columnLimits = computed(() => {
        const limits = this.cardLimits();
        return limits ? capToColumn(limits, this.columnWidth()) : null;
    });
    /** Whether the column is narrower than the card's minimum width, so the card scrolls sideways within it. */
    readonly scrolling = computed(() => {
        const minimum = this.minimumWidth();
        const column = this.columnWidth();
        return minimum !== null && column !== null && column < minimum;
    });
    /** The width the resizable card is shown at within its column, in whole px; null for any other card or while it is unknown. */
    readonly displayedWidth = computed(() => {
        const width = this.source.sizableCard()?.shownWidth() ?? null;
        const limits = this.columnLimits();
        return width !== null && limits ? clampWidth(width, limits) : null;
    });
    readonly heightPerWidth = computed(() => heightPerWidthOf(this.source.dimensions()));

    constructor(private readonly source: CardSizingSource) {
        const destroyRef = inject(DestroyRef);
        afterNextRender(() => destroyRef.onDestroy(observeColumnWidth(source.host, (width) => this.columnWidth.set(width))));
        effect((onCleanup) => {
            const frame = source.frame()?.nativeElement;
            const probe = source.insetProbe()?.nativeElement;
            if (frame && probe) {
                onCleanup(
                    observeBoxSize(frame, (size) => {
                        this.insetMinimum.set({ width: probe.offsetWidth, height: probe.offsetHeight });
                        this.shownSize.set(size);
                    }),
                );
            }
        });
    }

    /** The width the frame is laid out at now, in CSS px. */
    readonly frameWidth = (): number => this.source.frame()?.nativeElement.getBoundingClientRect().width ?? 0;
}
