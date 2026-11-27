import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MediaSizeLimits, typedWidthOf } from './media-size-limits';

/**
 * The size readout of a media card beside its projected resize handle. The readout shows the
 * card's width while the handle is hovered, focused from the keyboard or dragged, and stays while
 * the pointer moves onto it. Pressing the readout turns it into a px field holding that width.
 * Enter, Escape and leaving the field all close it and report a changed width, brought into the
 * limits; a blank field reports the removal of the saved width, and an unchanged or non-numeric
 * value reports nothing. The host carries the `size-control--resizing` class while a resize is in
 * progress.
 */
@Component({
    selector: 'crczp-media-size-control',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './media-size-control.component.html',
    styleUrl: './media-size-control.component.scss',
    host: { '[class.size-control--resizing]': 'resizing()' },
})
export class MediaSizeControlComponent {
    private readonly injector = inject(Injector);
    private readonly widthField = viewChild<ElementRef<HTMLInputElement>>('widthField');
    private readonly readoutButton = viewChild<ElementRef<HTMLButtonElement>>('readoutButton');

    /** The width the readout shows, in whole px; null while unknown, which leaves the readout out. */
    readonly width = input<number | null>(null);
    /** The widths a typed width is brought into; null while unknown, which leaves the readout out. */
    readonly limits = input<MediaSizeLimits | null>(null);
    /** Whether a resize is in progress, which keeps the readout shown. */
    readonly resizing = input(false);

    /** A changed typed width to save, or undefined to remove the saved width. */
    readonly widthTyped = output<number | undefined>();

    protected readonly editing = signal(false);
    /** The width the field opened with. */
    protected readonly openedWidth = signal(0);
    /** The text the field holds while editing. */
    protected readonly draft = signal('');
    /** How many characters the box makes room for, so the readout and the field take the same width. */
    protected readonly characters = computed(() =>
        Math.max(1, this.editing() ? this.draft().length : String(this.width() ?? '').length),
    );

    protected startEditing(): void {
        const width = this.width() ?? 0;
        this.openedWidth.set(width);
        this.draft.set(String(width));
        this.editing.set(true);
        afterNextRender(
            {
                write: () => {
                    const field = this.widthField()?.nativeElement;
                    field?.focus();
                    field?.select();
                },
            },
            { injector: this.injector },
        );
    }

    protected onFieldKeydown(event: KeyboardEvent, field: HTMLInputElement): void {
        if (event.key !== 'Enter' && event.key !== 'Escape') {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (!this.save(field)) {
            afterNextRender({ write: () => this.readoutButton()?.nativeElement.focus() }, { injector: this.injector });
        }
    }

    /** Closes the field and reports the width it holds when that differs from the opened one; returns whether it reported. */
    protected save(field: HTMLInputElement): boolean {
        if (!this.editing()) {
            return false;
        }
        this.editing.set(false);
        const text = field.value.trim();
        const typed = Number(text);
        const limits = this.limits();
        if (!limits || (text !== '' && (!Number.isFinite(typed) || typed === this.openedWidth()))) {
            return false;
        }
        this.widthTyped.emit(typedWidthOf(text, limits));
        return true;
    }
}
