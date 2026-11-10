import { computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { AttachmentDownload } from './attachment-download';

/** Where an audio or video card stands, from the untouched file to playback. */
export type MediaCardState = 'not-loaded' | 'downloading' | 'ready' | 'playing' | 'failed';

const SEEK_STEP_SECONDS = 5;

/** The accessible name of a card's play toggle. */
export function toggleLabelOf(state: MediaCardState, fileName: string): string {
    switch (state) {
        case 'playing':
            return `Pause ${fileName}`;
        case 'downloading':
            return `Downloading ${fileName}`;
        case 'failed':
            return `Retry ${fileName}`;
        default:
            return `Play ${fileName}`;
    }
}

/** The icon name of a card's play toggle. */
export function toggleIconOf(state: MediaCardState): string {
    switch (state) {
        case 'playing':
            return 'pause';
        case 'downloading':
            return 'downloading';
        case 'failed':
            return 'replay';
        default:
            return 'play_arrow';
    }
}

/**
 * Drives one media element from a download: it points the element at the downloaded file and
 * exposes the card state, the playback position and the length as signals, plus play, pause
 * and seek. Playing a file not yet downloaded downloads it first and starts playback on arrival.
 * Created in an injection context; pauses on destroy.
 */
export class MediaPlayback {
    private readonly element = signal<HTMLMediaElement | null>(null);
    private readonly broken = signal(false);
    private readonly mediaLength = signal<number | null>(null);
    private playRequested = false;
    private pendingSeekSeconds: number | null = null;

    readonly playing = signal(false);
    /** Playback position in seconds. */
    readonly position = signal(0);
    /** Length in seconds: the element's once it knows it, else the stored one, else null. */
    readonly length = computed(() => this.mediaLength() ?? this.storedLength() ?? null);
    /** Playback position as a 0 to 1 fraction of the length. */
    readonly positionFraction = computed(() => {
        const length = this.length();
        return length ? Math.min(1, this.position() / length) : 0;
    });
    /** Whether the file is downloaded, so position and seeking mean something. */
    readonly seekable = computed(() => this.download.state() === 'loaded' && !this.broken());
    readonly state = computed<MediaCardState>(() => {
        switch (this.download.state()) {
            case 'idle':
                return 'not-loaded';
            case 'loading':
                return 'downloading';
            case 'error':
                return 'failed';
            default:
                if (this.broken()) {
                    return 'failed';
                }
                return this.playing() ? 'playing' : 'ready';
        }
    });

    constructor(
        private readonly download: AttachmentDownload,
        private readonly storedLength: () => number | undefined,
    ) {
        effect(() => {
            const element = this.element();
            const url = this.download.url();
            if (element) {
                untracked(() => this.load(element, url));
            }
        });
        inject(DestroyRef).onDestroy(() => this.element()?.pause());
    }

    /** Binds the element this playback drives and follows its events. */
    attach(element: HTMLMediaElement): void {
        const syncPlaying = () => this.playing.set(!element.paused && !element.ended);
        element.preload = 'none';
        element.addEventListener('play', syncPlaying);
        element.addEventListener('pause', syncPlaying);
        element.addEventListener('ended', syncPlaying);
        element.addEventListener('timeupdate', () => this.position.set(element.currentTime));
        element.addEventListener('loadedmetadata', () => {
            this.mediaLength.set(Number.isFinite(element.duration) ? element.duration : null);
            this.applyPendingSeek(element);
        });
        element.addEventListener('error', () => this.broken.set(element.hasAttribute('src')));
        this.element.set(element);
    }

    /** Plays or pauses; downloads first when the file is not loaded, and downloads again after a failure. */
    toggle(): void {
        const element = this.element();
        switch (this.state()) {
            case 'downloading':
                return;
            case 'not-loaded':
            case 'failed':
                this.playRequested = true;
                this.download.start();
                return;
            case 'playing':
                element?.pause();
                return;
            default:
                this.play(element);
        }
    }

    /** Moves the position; a seek asked before the element knows its metadata is applied once it does. */
    seekTo(seconds: number): void {
        const element = this.element();
        if (!element || !this.seekable()) {
            return;
        }
        if (element.readyState === HTMLMediaElement.HAVE_NOTHING) {
            this.pendingSeekSeconds = Math.max(0, seconds);
            this.position.set(this.pendingSeekSeconds);
            return;
        }
        element.currentTime = Math.min(Math.max(0, seconds), this.length() ?? seconds);
        this.position.set(element.currentTime);
    }

    seekBy(deltaSeconds: number): void {
        this.seekTo(this.position() + deltaSeconds);
    }

    /** Seeks to a 0 to 1 fraction of the length. */
    seekToFraction(fraction: number): void {
        const length = this.length();
        if (length) {
            this.seekTo(fraction * length);
        }
    }

    /** Handles the keys of a seek control: Space and Enter toggle, arrows step, Home and End jump. */
    handleKey(event: KeyboardEvent): void {
        const actions: Readonly<Record<string, () => void>> = {
            ' ': () => this.toggle(),
            Enter: () => this.toggle(),
            ArrowLeft: () => this.seekBy(-SEEK_STEP_SECONDS),
            ArrowDown: () => this.seekBy(-SEEK_STEP_SECONDS),
            ArrowRight: () => this.seekBy(SEEK_STEP_SECONDS),
            ArrowUp: () => this.seekBy(SEEK_STEP_SECONDS),
            Home: () => this.seekTo(0),
            End: () => this.seekTo(this.length() ?? 0),
        };
        const action = actions[event.key];
        if (action) {
            event.preventDefault();
            action();
        }
    }

    private load(element: HTMLMediaElement, url: string | null): void {
        this.broken.set(false);
        if (!url) {
            if (element.hasAttribute('src')) {
                element.removeAttribute('src');
                element.load();
            }
            this.position.set(0);
            this.mediaLength.set(null);
            this.playing.set(false);
            return;
        }
        this.pendingSeekSeconds = null;
        element.preload = 'metadata';
        element.src = url;
        if (this.playRequested) {
            this.play(element);
        }
    }

    private applyPendingSeek(element: HTMLMediaElement): void {
        const seconds = this.pendingSeekSeconds;
        if (seconds === null) {
            return;
        }
        this.pendingSeekSeconds = null;
        element.currentTime = Math.min(seconds, this.length() ?? seconds);
        this.position.set(element.currentTime);
    }

    private play(element: HTMLMediaElement | null): void {
        this.playRequested = false;
        void element?.play().catch(() => undefined);
    }
}
