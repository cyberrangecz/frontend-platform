import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentDownload } from '../attachment/attachment-download';
import { AttachmentPoster } from '../attachment/attachment-poster';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { ByteSizePipe } from '../attachment/byte-size.pipe';
import { aspectRatioOf, imageSizeLimits, MeasuredSize, shownWidthOf } from './media-size-limits';
import { observeBoxSize } from './observe-box-size';
import { ProgressRingComponent } from './progress-ring.component';
import { reportSizableCard, SizableCard } from './sizable-card-slot';

/**
 * An image attachment. It reserves its saved or stored width and its stored height before the
 * download and shows the stored thumbnail, when the file has one, until the full image replaces
 * it. While a transfer runs, a progress ring circles the download button, as on the file card;
 * once the file has arrived, the image is drawn inline, so an animated image starts from its
 * first frame then. The widths it can be resized to are known once its download button has been
 * laid out with a size. The host carries the state (idle, loading, loaded, error) as a class and
 * a data attribute, and the progress as a custom property.
 */
@Component({
    selector: 'crczp-image-media',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, ByteSizePipe, ProgressRingComponent],
    templateUrl: './image-media.component.html',
    styleUrl: './image-media.component.scss',
    host: {
        '[class]': '"image-media--" + download.state()',
        '(click)': 'startFromFrame($event)',
        '[attr.data-state]': 'download.state()',
        '[style.--image-media-progress]': 'download.progress()',
    },
})
export class ImageMediaComponent implements SizableCard {
    readonly metadata = input.required<AttachmentMetadata>();
    readonly label = input('');
    /** Saved maximum display width in CSS px, brought into the size limits; the stored width applies when unset. */
    readonly maxWidth = input<number>();

    private readonly metadataSize = computed(() => this.metadata().size);
    protected readonly download = new AttachmentDownload(() => this.metadata().hash);
    protected readonly poster = new AttachmentPoster(() => this.metadata().hash);
    protected readonly aspectRatio = computed(() => aspectRatioOf(this.metadata()));

    private readonly downloadButtonProbe = viewChild('downloadButtonProbe', { read: ElementRef<HTMLElement> });
    private readonly downloadButtonSize = signal<MeasuredSize | null>(null);
    private readonly naturalWidth = signal<number | null>(null);
    /** The widths the card may be shown at; null until the download button has been laid out with a size. */
    readonly sizeLimits = computed(() => {
        const button = this.downloadButtonSize();
        return button ? imageSizeLimits(this.metadata(), button) : null;
    });
    /** The width the frame is given: the saved or stored one, or the loaded picture's own when no dimensions are stored; null while unknown. */
    readonly shownWidth = computed(() => shownWidthOf(this.maxWidth(), this.metadata(), this.sizeLimits()) ?? this.naturalWidth());

    /** The downloaded file whose inline image has loaded over the thumbnail. */
    private readonly revealedUrl = signal<string | null>(null);
    protected readonly thumbnailShown = computed(() => {
        const url = this.download.url();
        return this.download.state() !== 'error' && !!this.poster.url() && !(url && this.revealedUrl() === url);
    });

    constructor() {
        reportSizableCard(this);
        effect((onCleanup) => {
            const probe = this.downloadButtonProbe()?.nativeElement;
            if (probe) {
                onCleanup(observeBoxSize(probe, (size) => this.downloadButtonSize.set(size)));
            }
        });
        effect(() => {
            const size = this.metadataSize();
            untracked(() => this.download.startIfSmall(size));
        });
    }

    /** Starts the download from a click anywhere on the image frame while the file has not been requested; the button's click bubbles here. */
    protected startFromFrame(event: MouseEvent): void {
        if (this.download.state() === 'idle' && event.target instanceof Element && event.target.closest('.image-frame')) {
            this.download.start();
        }
    }

    protected pictureLoaded(picture: HTMLImageElement): void {
        this.naturalWidth.set(picture.naturalWidth || null);
        this.revealedUrl.set(this.download.url());
    }
}
