import { DOCUMENT } from '@angular/common';
import {
    afterNextRender,
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    NgZone,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { timer } from 'rxjs';
import { AttachmentDownload } from '../attachment/attachment-download';
import { formatDuration } from '../attachment/attachment-kind';
import { AttachmentPoster } from '../attachment/attachment-poster';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { ByteSizePipe } from '../attachment/byte-size.pipe';
import { aspectRatioOf, hasKnownDimensions, shownWidthOf, videoSizeLimits } from './media-size-limits';
import { MediaCardState, MediaPlayback, toggleIconOf, toggleLabelOf } from '../attachment/media-playback';
import { placeholderColorsOf } from '../attachment/placeholder-colors';
import { reportSizableCard, SizableCard } from './sizable-card-slot';
import { CONTROLS_FOOTER_DELAY_MS, VideoControlsComponent } from './video-controls.component';
import { StrandsLine, VideoStrandsPainter, VideoStrandsScene } from './video-strands-painter';

/** The playback states in which the cover with the poster and the toggle is drawn instead of the player. */
const COVERED_STATES: ReadonlySet<MediaCardState> = new Set(['not-loaded', 'downloading', 'failed']);

/**
 * A video attachment. Before the download it shows the stored poster (a hash-seeded placeholder
 * when there is none) with the size, the length and a toggle that offers the download, or
 * playback when the file is already at hand; the toggle downloads the file and then plays it
 * with the platform's own control bar. While a transfer runs, the poster is slightly desaturated
 * and strands drawn by {@link VideoStrandsPainter} run along its bottom edge; once the file has
 * arrived, they collapse into the control bar's seek track while the colour returns and the
 * toggle leaves. A file already at hand plays at once, with no strands. The frame is as wide as
 * the saved or stored width, brought into the size limits, when one applies. The host carries the state (not-loaded, downloading, ready, playing, failed) as a class and a data
 * attribute, whether the bar is still forming as a class, the downloaded fraction and the playback
 * position as custom properties, and which poster is drawn as a data attribute.
 */
@Component({
    selector: 'crczp-video-media',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, ByteSizePipe, VideoControlsComponent],
    templateUrl: './video-media.component.html',
    styleUrl: './video-media.component.scss',
    host: {
        '[class]': '"video-media--" + playback.state()',
        '[class.video-media--forming]': 'forming()',
        '[attr.data-state]': 'playback.state()',
        '[attr.data-poster]': 'posterKind()',
        '[style.--video-media-progress]': 'download.progress()',
        '[style.--video-media-position]': 'playback.positionFraction()',
        '[style.--media-placeholder-from]': 'colors().from',
        '[style.--media-placeholder-to]': 'colors().to',
    },
})
export class VideoMediaComponent implements SizableCard {
    readonly metadata = input.required<AttachmentMetadata>();
    readonly label = input('');
    /** Saved maximum display width in CSS px, brought into the size limits; the stored width applies when unset. */
    readonly maxWidth = input<number>();

    private readonly metadataSize = computed(() => this.metadata().size);
    protected readonly download = new AttachmentDownload(() => this.metadata().hash);
    protected readonly playback = new MediaPlayback(this.download, () => this.metadata().durationSeconds);
    protected readonly poster = new AttachmentPoster(() => this.metadata().hash);

    private readonly player = viewChild.required<ElementRef<HTMLVideoElement>>('player');
    private readonly strandsCanvas = viewChild<ElementRef<HTMLCanvasElement>>('strands');
    private readonly controls = viewChild(VideoControlsComponent);
    private readonly zone = inject(NgZone);
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly coverToggle = viewChild<ElementRef<HTMLButtonElement>>('coverToggle');
    /** The downloaded file whose strands have become the playback bar. */
    private readonly formedUrl = signal<string | null>(null);
    /** Whether the running or finished download had to transfer the file, so its progress is shown. */
    private readonly transferShown = signal(false);
    private wasCovered = true;
    /** Whether the cover's toggle held keyboard focus as the cover gave way to the player, so the player's toggle should take it over. */
    private focusHandoffPending = false;
    private strands: { readonly canvas: HTMLCanvasElement; readonly painter: VideoStrandsPainter } | null = null;

    protected readonly aspectRatio = computed(() => aspectRatioOf(this.metadata()));
    /** The widths the card may be shown at; a video stored narrower than the minimum is scaled up to it. */
    readonly sizeLimits = computed(() => videoSizeLimits(hasKnownDimensions(this.metadata()) ? this.metadata() : {}));
    /** The frame width in CSS px: the saved one, else the stored one when its dimensions are known, brought into the size limits; null for the default size. */
    readonly shownWidth = computed(() => shownWidthOf(this.maxWidth(), this.metadata(), this.sizeLimits()));
    protected readonly frameWidth = computed(() => {
        const width = this.shownWidth();
        return width ? `${width}px` : null;
    });
    protected readonly posterKind = computed(() => {
        if (this.poster.url()) {
            return 'stored';
        }
        return this.poster.loading() ? 'loading' : 'placeholder';
    });
    protected readonly colors = computed(() => placeholderColorsOf(this.metadata().hash));
    protected readonly duration = computed(() => {
        const { durationSeconds } = this.metadata();
        return durationSeconds === undefined ? null : formatDuration(durationSeconds);
    });
    /** Whether the cover with the poster and the toggle is drawn instead of the player. */
    protected readonly covered = computed(() => COVERED_STATES.has(this.playback.state()));
    /** Whether the downloaded file's strands are still collapsing into the playback bar. */
    protected readonly forming = computed(
        () => this.transferShown() && this.playback.seekable() && this.formedUrl() !== this.download.url(),
    );
    protected readonly strandsDrawn = computed(
        () => this.transferShown() && (this.playback.state() === 'downloading' || this.forming()),
    );
    /** Whether the cover offers a download: the file is not yet at hand. */
    private readonly offersDownload = computed(() => this.playback.state() === 'not-loaded' && !this.download.alreadyDownloaded());
    protected readonly toggleLabel = computed(() => {
        const { fileName } = this.metadata();
        return this.offersDownload() ? `Download and play ${fileName}` : toggleLabelOf(this.playback.state(), fileName);
    });
    /** The cover toggle's icon: download until the file is at hand, done while the bar forms, else the playback icon. */
    protected readonly toggleIcon = computed(() => {
        const state = this.playback.state();
        if (this.forming()) {
            return 'download_done';
        }
        if (this.offersDownload()) {
            return 'download';
        }
        if (state === 'downloading' && !this.transferShown()) {
            return toggleIconOf('ready');
        }
        return toggleIconOf(state);
    });

    private readonly strandsScene = computed<VideoStrandsScene>(() => ({
        state: this.playback.state(),
        progress: this.download.progress(),
        position: this.playback.positionFraction(),
        lengthSeconds: this.playback.length(),
    }));

    constructor() {
        reportSizableCard(this);
        afterNextRender(() => this.playback.attach(this.player().nativeElement));
        effect(() => {
            const size = this.metadataSize();
            untracked(() => this.download.startIfSmall(size));
        });
        effect(() => {
            if (this.download.state() === 'loading') {
                untracked(() => this.transferShown.set(!this.download.alreadyDownloaded()));
            }
        });
        effect(() => {
            const covered = this.covered();
            untracked(() => {
                if (this.wasCovered && !covered && this.coverToggle()?.nativeElement === this.document.activeElement) {
                    this.focusHandoffPending = true;
                }
                this.wasCovered = covered;
            });
        });
        afterRenderEffect(() => {
            const handedOver = !this.covered() && !this.forming();
            if (handedOver && this.focusHandoffPending) {
                this.focusHandoffPending = false;
                const delay = this.transferShown() ? CONTROLS_FOOTER_DELAY_MS : 0;
                timer(delay)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe(() => this.controls()?.focusToggle());
            }
        });
        afterRenderEffect(() => {
            const scene = this.strandsScene();
            const canvas = this.strandsCanvas()?.nativeElement ?? null;
            this.zone.runOutsideAngular(() => this.paintStrands(canvas, scene));
        });
        this.destroyRef.onDestroy(() => this.strands?.painter.destroy());
    }

    /** Hands the scene to the painter of the drawn canvas, replacing the painter when the canvas is replaced or removed. */
    private paintStrands(canvas: HTMLCanvasElement | null, scene: VideoStrandsScene): void {
        if (this.strands?.canvas !== canvas) {
            this.strands?.painter.destroy();
            this.strands = canvas
                ? {
                      canvas,
                      painter: new VideoStrandsPainter(
                          canvas,
                          () => this.seekTrackOver(canvas),
                          () => this.zone.run(() => this.formedUrl.set(this.download.url())),
                      ),
                  }
                : null;
        }
        this.strands?.painter.update(scene);
    }

    /** Where the playback bar's seek track lies on the canvas, or null while there is no bar. */
    private seekTrackOver(canvas: HTMLCanvasElement): StrandsLine | null {
        const track = this.controls()?.seekTrackBounds();
        if (!track) {
            return null;
        }
        const origin = canvas.getBoundingClientRect();
        return {
            left: track.left - origin.left,
            right: track.right - origin.left,
            middle: track.top + track.height / 2 - origin.top,
            thickness: track.height,
        };
    }
}
