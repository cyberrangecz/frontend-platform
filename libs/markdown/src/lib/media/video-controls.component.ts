import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlider, MatSliderModule } from '@angular/material/slider';
import { fromEvent, map, startWith, switchMap } from 'rxjs';
import { formatDuration } from '../attachment/attachment-kind';
import { DownloadConfirmation } from '../attachment/download-confirmation';
import { VIDEO_MINIMUM_WIDTH_PIXELS } from './media-size-limits';
import { MediaPlayback, toggleIconOf, toggleLabelOf } from '../attachment/media-playback';
import { saveFile } from '../attachment/save-file';
import { DownloadIconComponent } from './download-icon.component';
import { visibleButtonCount } from './video-controls-overflow';

/** How long after the bar has formed its footer stays hidden; matches the footer delay of the stylesheet. */
export const CONTROLS_FOOTER_DELAY_MS = 500;

/** Volume a muted video returns to when it is unmuted at zero volume. */
const RESTORED_VOLUME = 1;

/** Playback speeds the speed button steps through, slowest first. */
const PLAYBACK_RATES: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** One option of the footer: a button of its own, or an entry of the overflow menu when the bar is too narrow. */
interface FooterOption {
    readonly id: 'speed' | 'download' | 'picture-in-picture';
    readonly label: string;
    readonly icon: string;
    readonly run: () => void;
}

/**
 * The control bar of a downloaded video: a seek slider above a footer holding play and pause,
 * mute with a volume slider, the elapsed and total time, the options (playback speed, download
 * and picture in picture where the browser supports it) and full screen. The options sit in priority order and the lowest ones move into an overflow
 * menu only when the footer is too narrow for them. Seek keys follow the audio card's: arrows step,
 * Home and End jump, Space and Enter toggle playback. While the bar is forming, its seek track,
 * handle and footer are not drawn; once it has formed, the handle grows in and the footer follows
 * after a short delay.
 */
@Component({
    selector: 'crczp-video-controls',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatMenuModule, MatSliderModule, DownloadIconComponent],
    templateUrl: './video-controls.component.html',
    styleUrl: './video-controls.component.scss',
    host: {
        '[class.controls--forming]': 'forming()',
        '[style.--controls-minimum-width]': 'minimumWidth + "px"',
        '(document:fullscreenchange)': 'syncFullscreen()',
    },
})
export class VideoControlsComponent {
    /** The narrowest width, in CSS px, at which the bar lays its fixed controls out unclipped; the styles read it as a custom property. */
    protected readonly minimumWidth = VIDEO_MINIMUM_WIDTH_PIXELS;

    readonly playback = input.required<MediaPlayback>();
    readonly media = input.required<HTMLVideoElement>();
    /** The element shown in full screen: the frame holding the video and this bar. */
    readonly fullscreenTarget = input.required<HTMLElement>();
    readonly fileName = input.required<string>();
    /** Whether something drawn over the bar is still turning into its seek track. */
    readonly forming = input(false);
    /** Object URL of the downloaded file; without it the footer offers no download. */
    readonly downloadUrl = input<string | null>(null);

    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly seek = viewChild(MatSlider, { read: ElementRef<HTMLElement> });
    private readonly footer = viewChild.required<ElementRef<HTMLElement>>('footer');
    private readonly spacer = viewChild.required<ElementRef<HTMLElement>>('spacer');
    private readonly toggleButton = viewChild.required<ElementRef<HTMLElement>>('toggleButton');
    private readonly muteButton = viewChild.required('muteButton', { read: ElementRef<HTMLElement> });
    /** How many options the footer has room for beside the overflow button. */
    private readonly visibleOptionCount = signal(Number.POSITIVE_INFINITY);

    protected readonly confirmation = new DownloadConfirmation(() => this.fileName());

    protected readonly fullscreenAvailable = this.document.fullscreenEnabled;
    protected readonly fullscreen = signal(false);

    private readonly sound = toSignal(
        toObservable(this.media).pipe(
            switchMap((media) =>
                fromEvent(media, 'volumechange').pipe(
                    startWith(null),
                    map(() => ({ volume: media.volume, muted: media.muted })),
                ),
            ),
        ),
        { initialValue: { volume: RESTORED_VOLUME, muted: false } },
    );
    protected readonly audible = computed(() => !this.sound().muted && this.sound().volume > 0);
    protected readonly volume = computed(() => (this.audible() ? this.sound().volume : 0));
    protected readonly volumeIcon = computed(() => {
        if (!this.audible()) {
            return 'volume_off';
        }
        return this.sound().volume < 0.5 ? 'volume_down' : 'volume_up';
    });

    private readonly playbackRate = toSignal(
        toObservable(this.media).pipe(
            switchMap((media) =>
                fromEvent(media, 'ratechange').pipe(
                    startWith(null),
                    map(() => media.playbackRate),
                ),
            ),
        ),
        { initialValue: 1 },
    );
    protected readonly rateText = computed(() => `${this.playbackRate()}×`);
    private readonly nextRate = computed(() => PLAYBACK_RATES.find((rate) => rate > this.playbackRate()) ?? PLAYBACK_RATES[0] ?? 1);

    /** The footer's options in priority order, highest first; unsupported ones are left out. */
    private readonly options = computed<readonly FooterOption[]>(() => {
        const options: FooterOption[] = [
            {
                id: 'speed',
                label: `Playback speed ${this.rateText()}, change to ${this.nextRate()}×`,
                icon: 'speed',
                run: () => (this.media().playbackRate = this.nextRate()),
            },
        ];
        if (this.downloadUrl()) {
            options.push({ id: 'download', label: `Download ${this.fileName()}`, icon: 'download', run: () => this.saveDownload() });
        }
        if (this.document.pictureInPictureEnabled && !this.media().disablePictureInPicture) {
            options.push({ id: 'picture-in-picture', label: 'Picture in picture', icon: 'picture_in_picture_alt', run: () => this.togglePictureInPicture() });
        }
        return options;
    });
    protected readonly shownOptions = computed(() => this.options().slice(0, this.visibleOptionCount()));
    protected readonly overflowOptions = computed(() => this.options().slice(this.visibleOptionCount()));

    protected readonly toggleLabel = computed(() => toggleLabelOf(this.playback().state(), this.fileName()));
    protected readonly toggleIcon = computed(() => toggleIconOf(this.playback().state()));
    protected readonly timeLabel = computed(
        () => `${formatDuration(this.playback().position())} / ${formatDuration(this.playback().length() ?? 0)}`,
    );

    /** Spoken value of the seek slider, whose value is the played fraction. */
    protected readonly describeSeekValue = (fraction: number): string => {
        const length = this.playback().length() ?? 0;
        return `${formatDuration(fraction * length)} of ${formatDuration(length)}`;
    };
    /** Spoken value of the volume slider. */
    protected readonly describeVolume = (volume: number): string => `${Math.round(volume * 100)}%`;

    constructor() {
        afterNextRender(() => {
            const observer = new ResizeObserver(() => this.fitOptions());
            observer.observe(this.footer().nativeElement);
            this.destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    /** Moves keyboard focus to the play and pause button. */
    focusToggle(): void {
        this.toggleButton().nativeElement.focus();
    }

    /** Where the seek track lies in the viewport: the slider's track, or null while it is not rendered. */
    seekTrackBounds(): DOMRect | null {
        return this.seek()?.nativeElement.querySelector('.mdc-slider__track')?.getBoundingClientRect() ?? null;
    }

    /**
     * Sets how many options get a button of their own from the room the footer's spacer leaves,
     * less any width the footer's content exceeds it by, plus the room the option and overflow
     * buttons now drawn take.
     */
    private fitOptions(): void {
        const footer = this.footer().nativeElement;
        const gap = parseFloat(getComputedStyle(footer).columnGap) || 0;
        const buttonWidth = this.muteButton().nativeElement.offsetWidth;
        const drawn = this.shownOptions().length + (this.overflowOptions().length ? 1 : 0);
        const deficit = Math.max(0, footer.scrollWidth - footer.clientWidth);
        const room = this.spacer().nativeElement.offsetWidth - deficit + drawn * (buttonWidth + gap);
        this.visibleOptionCount.set(visibleButtonCount(room, buttonWidth, gap, this.options().length));
    }

    private saveDownload(): void {
        const url = this.downloadUrl();
        if (url && !this.confirmation.active()) {
            saveFile(url, this.fileName());
            this.confirmation.start();
        }
    }

    private togglePictureInPicture(): void {
        if (this.document.pictureInPictureElement) {
            void this.document.exitPictureInPicture().catch(() => undefined);
        } else {
            void this.media().requestPictureInPicture().catch(() => undefined);
        }
    }

    protected toggleMute(): void {
        const media = this.media();
        if (this.audible()) {
            media.muted = true;
            return;
        }
        media.muted = false;
        if (media.volume === 0) {
            media.volume = RESTORED_VOLUME;
        }
    }

    protected changeVolume(volume: number): void {
        const media = this.media();
        media.volume = volume;
        media.muted = volume === 0;
    }

    protected toggleFullscreen(): void {
        if (this.document.fullscreenElement) {
            void this.document.exitFullscreen().catch(() => undefined);
        } else {
            void this.fullscreenTarget().requestFullscreen().catch(() => undefined);
        }
    }

    protected syncFullscreen(): void {
        this.fullscreen.set(this.document.fullscreenElement === this.fullscreenTarget());
    }
}
