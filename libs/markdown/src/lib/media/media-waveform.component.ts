import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, NgZone, viewChild } from '@angular/core';
import { formatDuration } from '../attachment/attachment-kind';
import { MediaPlayback } from '../attachment/media-playback';
import { AudioWaveformPainter, WaveformScene } from './audio-waveform-painter';

/**
 * A seek slider drawn as a media card's waveform by {@link AudioWaveformPainter}: clicking or
 * dragging seeks to the pointed spot, and the keys follow {@link MediaPlayback.handleKey}. The
 * played ink comes from the `--media-waveform-played-ink` custom property and the unplayed ink
 * from `--media-waveform-rest-ink`; the waves swing in proportion to the element's height.
 */
@Component({
    selector: 'crczp-media-waveform',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './media-waveform.component.html',
    styleUrl: './media-waveform.component.scss',
    host: {
        role: 'slider',
        'aria-label': 'Seek',
        'aria-valuemin': '0',
        '[attr.tabindex]': 'playback().seekable() ? 0 : -1',
        '[attr.aria-disabled]': '!playback().seekable()',
        '[attr.aria-valuemax]': 'playback().length()',
        '[attr.aria-valuenow]': 'playback().position()',
        '[attr.aria-valuetext]': 'positionText()',
        '(keydown)': 'playback().handleKey($event)',
        '(pointerdown)': 'startSeeking($event)',
        '(pointermove)': 'continueSeeking($event)',
        '(pointerup)': 'stopSeeking($event)',
        '(pointercancel)': 'stopSeeking($event)',
    },
})
export class MediaWaveformComponent {
    readonly playback = input.required<MediaPlayback>();
    readonly scene = input.required<WaveformScene>();

    protected readonly positionText = computed(
        () => `${formatDuration(this.playback().position())} of ${formatDuration(this.playback().length() ?? 0)}`,
    );

    private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
    private readonly zone = inject(NgZone);
    private painter?: AudioWaveformPainter;
    private seeking = false;

    constructor() {
        afterRenderEffect(() => {
            const scene = this.scene();
            this.zone.runOutsideAngular(() => {
                this.painter ??= new AudioWaveformPainter(this.canvas().nativeElement);
                this.painter.update(scene);
            });
        });
        inject(DestroyRef).onDestroy(() => this.painter?.destroy());
    }

    protected startSeeking(event: PointerEvent): void {
        if (!this.playback().seekable()) {
            return;
        }
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        this.seeking = true;
        this.seekFromPointer(event);
    }

    protected continueSeeking(event: PointerEvent): void {
        if (this.seeking) {
            this.seekFromPointer(event);
        }
    }

    protected stopSeeking(event: PointerEvent): void {
        this.seeking = false;
        (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    }

    private seekFromPointer(event: PointerEvent): void {
        const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
        this.playback().seekToFraction((event.clientX - bounds.left) / bounds.width);
    }
}
