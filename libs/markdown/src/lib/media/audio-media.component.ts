import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AttachmentDownload } from '../attachment/attachment-download';
import { formatDuration, lengthLabelOf } from '../attachment/attachment-kind';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { MediaPlayback, toggleIconOf, toggleLabelOf } from '../attachment/media-playback';
import { placeholderColorsOf } from '../attachment/placeholder-colors';
import { WaveformScene } from './audio-waveform-painter';
import { loudnessOf } from './media-loudness';
import { MediaWaveformComponent } from './media-waveform.component';

/**
 * An audio attachment. Before the download it shows a flat line, the stored length (the size
 * when the file has no metadata) and a toggle that offers the download, or playback when the file
 * is already at hand; the toggle downloads the file, decodes its waveform and plays it. The
 * toggle shows the play icon once the downloaded waves have settled into the waveform. The host carries the state (not-loaded, downloading, ready, playing, failed) as a class
 * and a data attribute, the downloaded fraction and the playback position as custom properties,
 * and whether the real waveform is drawn as a data attribute. The waveform itself is a
 * {@link MediaWaveformComponent}.
 */
@Component({
    selector: 'crczp-audio-media',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MediaWaveformComponent],
    templateUrl: './audio-media.component.html',
    styleUrl: './audio-media.component.scss',
    host: {
        '[class]': '"audio-media--" + playback.state()',
        '[attr.data-state]': 'playback.state()',
        '[attr.data-waveform]': 'peaks() ? "decoded" : "flat"',
        '[style.--audio-media-progress]': 'download.progress()',
        '[style.--audio-media-position]': 'playback.positionFraction()',
        '[style.--media-placeholder-from]': 'colors().from',
        '[style.--media-placeholder-to]': 'colors().to',
    },
})
export class AudioMediaComponent {
    readonly metadata = input.required<AttachmentMetadata>();
    readonly label = input('');

    protected readonly download = new AttachmentDownload(() => this.metadata().hash);
    protected readonly playback = new MediaPlayback(this.download, () => this.metadata().durationSeconds);

    private readonly decoded = loudnessOf(() => this.download.url());

    /** The decoded loudness from 0 to 1 at evenly spaced points, or null until the downloaded bytes are decoded. */
    protected readonly peaks = computed(() => (this.decoded.hasValue() ? this.decoded.value() : null));
    protected readonly colors = computed(() => placeholderColorsOf(this.metadata().hash));
    /** Whether the running or finished download had to transfer the file, so its waves are shown. */
    private readonly transferShown = signal(false);
    /** Whether the file is still on its way to the waveform: transferring, or downloaded and not yet decoded. */
    protected readonly preparing = computed(() => {
        const state = this.playback.state();
        return state === 'downloading' || (state === 'ready' && this.transferShown() && this.peaks() === null && !this.decoded.error());
    });
    /** Whether the toggle offers a download: the file is not yet at hand. */
    private readonly offersDownload = computed(() => this.playback.state() === 'not-loaded' && !this.download.alreadyDownloaded());
    protected readonly toggleLabel = computed(() => {
        const { fileName } = this.metadata();
        if (this.offersDownload()) {
            return `Download and play ${fileName}`;
        }
        return toggleLabelOf(this.preparing() ? 'downloading' : this.playback.state(), fileName);
    });
    /** The toggle's icon: download until the file is at hand, downloading while it is prepared, else the playback icon. */
    protected readonly toggleIcon = computed(() => {
        if (this.offersDownload()) {
            return 'download';
        }
        if (this.preparing()) {
            return this.transferShown() ? 'downloading' : toggleIconOf('ready');
        }
        return toggleIconOf(this.playback.state());
    });
    protected readonly timeLabel = computed(() => {
        const length = this.playback.length();
        return this.playback.seekable() && length !== null
            ? `${formatDuration(this.playback.position())} / ${formatDuration(length)}`
            : lengthLabelOf(this.metadata());
    });
    protected readonly scene = computed<WaveformScene>(() => ({
        state: this.playback.state(),
        progress: this.download.progress(),
        peaks: this.decoded.error() ? [] : this.peaks(),
        position: this.playback.positionFraction(),
        lengthSeconds: this.playback.length(),
        transferShown: this.transferShown(),
    }));

    constructor() {
        this.playback.attach(new Audio());
        afterNextRender(() => this.download.startIfSmall(this.metadata().size));
        effect(() => {
            if (this.download.state() === 'loading') {
                untracked(() => this.transferShown.set(!this.download.alreadyDownloaded()));
            }
        });
    }

    /** Plays, pauses or downloads; ignored while the file is still being prepared. */
    protected toggle(): void {
        if (!this.preparing()) {
            this.playback.toggle();
        }
    }
}
