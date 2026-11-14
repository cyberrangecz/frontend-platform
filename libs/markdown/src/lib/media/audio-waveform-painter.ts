import { MediaCardState } from '../attachment/media-playback';
import { CanvasPainter } from './canvas-painter';
import { approach, clamp, easeInOutCubic, easeOutCubic, fadeAtEnds, Strand, STRANDS, strandSwingAt, swellAt } from './media-strands';

/** What the audio waveform shows at one moment. */
export interface WaveformScene {
    readonly state: MediaCardState;
    /** Downloaded fraction from 0 to 1, or null while the total is unknown. */
    readonly progress: number | null;
    /** Decoded loudness from 0 to 1 at evenly spaced points, null until decoded, empty when the audio cannot be decoded. */
    readonly peaks: readonly number[] | null;
    /** Playback position as a fraction of the length. */
    readonly position: number;
    readonly lengthSeconds: number | null;
    /** Whether the download ran as a visible transfer, so the accent ink tracks it and glides from full to the position. */
    readonly transferShown: boolean;
}

/** Share of its download wavelength a string tightens to in the decoded waveform, so the loudness shows in finer detail. */
const WAVEFORM_WAVELENGTH_SHARE = 0.45;
const SAMPLE_SPACING = 1;
/** Share of the canvas height the download waves swing out from the middle at full strength. */
const DOWNLOAD_SWING_SHARE = 0.24;
/** Share of the canvas height the loudest decoded point swings out from the middle. */
const WAVEFORM_SWING_SHARE = 0.46;
/** Pixels over which the download waves fade into the flat line at both ends of the downloaded range. */
const DOWNLOAD_FADE = 42;
/** Pixels over which the decoded waveform fades into the flat line at both ends of the canvas. */
const WAVEFORM_FADE = 6;
const ATTACK_MS = 500;
const MORPH_DURATION_MS = 1400;
/** Time constant by which the waves' reach follows the downloaded share. */
const SPAN_EASE_MS = 280;
/** Longest frame step the animation advances by, so a frame after a stall does not jump. */
const MAX_FRAME_STEP_MS = 100;
const HOVER_ALPHA = 0.3;
/** Opacity of the playback position hairline. */
const PLAYHEAD_ALPHA = 0.4;
/** Width of the playback position hairline, in CSS pixels. */
const PLAYHEAD_WIDTH = 2;

/**
 * Draws a media card's waveform on a canvas as a few layered strings. Before the download they
 * lie as a flat line. While the file downloads, waves travel along the downloaded range toward
 * its growing edge, fading into the flat line at both ends of the range; while the total is
 * unknown they travel along the whole width in the rest ink. Without download waves, the strings
 * lie flat until the loudness is known. Once the decoded
 * loudness is known, the waves slow to a stop and reshape into the waveform: the same strings,
 * now swinging as far as the audio is loud at each point. The stretch already played is drawn in
 * the accent ink, and a pointer over a seekable waveform previews the stretch up to it. Reads its
 * two inks from the canvas's computed `color` (accent) and `border-top-color` (rest).
 */
export class AudioWaveformPainter extends CanvasPainter {
    private readonly listeners = new AbortController();
    private scene: WaveformScene | null = null;
    private downloadStartedAt: number | null = null;
    private travelSeconds = 0;
    /** Share of the width the download waves reach, easing toward the downloaded share. */
    private span = 0;
    private lastFrameAt: number | null = null;
    private morphStartsAt: number | null = null;
    /** The last position the element reported and when it did; `at` stays null until the position first moves after playback starts. */
    private positionAnchor: { position: number; at: number | null } = { position: 0, at: 0 };
    private hover: number | null = null;
    private inks = { accent: '', rest: '' };

    /** @param canvas The canvas the waveform is drawn on. */
    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        const { signal } = this.listeners;
        canvas.addEventListener('pointermove', (event) => this.setHover(event.offsetX / (this.width || 1)), { signal });
        canvas.addEventListener('pointerleave', () => this.setHover(null), { signal });
    }

    /** Moves to a new scene, starting the animation its change calls for. */
    update(next: WaveformScene): void {
        const now = performance.now();
        const previous = this.scene;
        if (next.state === 'downloading' && previous?.state !== 'downloading') {
            this.downloadStartedAt = now;
            this.span = 0;
        } else if (next.state === 'not-loaded' || next.state === 'failed') {
            this.downloadStartedAt = null;
        }
        if (!next.peaks) {
            this.morphStartsAt = null;
        } else {
            this.morphStartsAt ??= now;
        }
        if (next.state === 'playing' && previous?.state !== 'playing') {
            this.positionAnchor = { position: next.position, at: null };
        }
        if (next.position !== previous?.position) {
            this.positionAnchor = { position: next.position, at: now };
        }
        this.scene = next;
        this.readInks();
        this.requestFrame();
    }

    override destroy(): void {
        super.destroy();
        this.listeners.abort();
    }

    protected override resized(): void {
        this.readInks();
    }

    protected override rested(): void {
        this.lastFrameAt = null;
    }

    private setHover(fraction: number | null): void {
        this.hover = fraction;
        this.requestFrame();
    }

    private readInks(): void {
        const style = getComputedStyle(this.canvas);
        this.inks = { accent: style.color, rest: style.borderTopColor };
    }

    protected animating(now: number): boolean {
        const state = this.scene?.state;
        return state === 'playing' || state === 'downloading' || (state === 'ready' && this.morph(now) < 1);
    }

    protected draw(now: number): void {
        const { context, width, height, scene } = this;
        context.clearRect(0, 0, width, height);
        if (!scene || width === 0 || height === 0) {
            return;
        }
        this.advance(scene, now);
        const envelope = this.envelope(scene, now);
        const fill = this.fillEnd(scene, now) * width;
        const hover = this.seekable(scene) && this.hover !== null ? this.hover * width : null;
        const settled = easeInOutCubic(this.morph(now));
        const wavelengthShare = 1 + (WAVEFORM_WAVELENGTH_SHARE - 1) * settled;
        for (const strand of STRANDS) {
            const path = this.strandPath(strand, envelope, wavelengthShare);
            this.paintBetween(path, strand, fill, width, this.inks.rest, strand.alpha);
            this.paintBetween(path, strand, 0, fill, this.inks.accent, strand.alpha);
            if (hover !== null) {
                this.paintBetween(path, strand, Math.min(fill, hover), Math.max(fill, hover), this.inks.accent, strand.alpha * HOVER_ALPHA);
            }
        }
        if (this.seekable(scene)) {
            this.paintPlayhead(fill, settled);
        }
    }

    /** A hairline at the playback position, fading in as the waves settle into the waveform and snapped to whole device pixels so it stays crisp. */
    private paintPlayhead(x: number, settled: number): void {
        const { context, width, height } = this;
        const ratio = devicePixelRatio || 1;
        const edge = PLAYHEAD_WIDTH / 2;
        const lineX = Math.round(Math.min(width - edge, Math.max(edge, x)) * ratio) / ratio;
        context.save();
        context.globalAlpha = PLAYHEAD_ALPHA * settled;
        context.strokeStyle = this.inks.accent;
        context.lineWidth = PLAYHEAD_WIDTH;
        context.beginPath();
        context.moveTo(lineX, 0);
        context.lineTo(lineX, height);
        context.stroke();
        context.restore();
    }

    /**
     * Advances by the time since the last frame: the crests travel on, slowing to a stop as the
     * morph runs, and the waves' reach eases toward the downloaded share, or the whole width while
     * the total is unknown.
     */
    private advance(scene: WaveformScene, now: number): void {
        const step = Math.min(MAX_FRAME_STEP_MS, now - (this.lastFrameAt ?? now));
        this.lastFrameAt = now;
        this.travelSeconds += (step / 1000) * (1 - easeOutCubic(this.morph(now)));
        const target = scene.state === 'downloading' ? (scene.progress ?? 1) : 1;
        this.span = approach(this.span, target, step, SPAN_EASE_MS);
    }

    private paintBetween(path: Path2D, strand: Strand, from: number, to: number, ink: string, alpha: number): void {
        if (to <= from || alpha <= 0) {
            return;
        }
        const { context } = this;
        context.save();
        context.beginPath();
        context.rect(from, 0, to - from, this.height);
        context.clip();
        context.globalAlpha = alpha;
        context.strokeStyle = ink;
        context.lineWidth = strand.lineWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.stroke(path);
        context.restore();
    }

    /** One string's path, its crests moved on by the travel so far and packed by the given share of the wavelength around the middle. */
    private strandPath(strand: Strand, envelope: readonly number[], wavelengthShare: number): Path2D {
        const path = new Path2D();
        const middle = this.height / 2;
        envelope.forEach((swing, index) => {
            const x = this.sampleX(index, envelope.length);
            const y = middle + swing * strandSwingAt(strand, x, this.width / 2, wavelengthShare, this.travelSeconds);
            if (index === 0) {
                path.moveTo(x, y);
            } else {
                path.lineTo(x, y);
            }
        });
        return path;
    }

    /** How far the strings may swing out from the middle at each sample, blending the download waves into the decoded waveform. */
    private envelope(scene: WaveformScene, now: number): number[] {
        const count = Math.max(2, Math.ceil(this.width / SAMPLE_SPACING) + 1);
        const morph = easeInOutCubic(this.morph(now));
        const strength = this.downloadStrength(scene, now);
        const span = this.span * this.width;
        return Array.from({ length: count }, (_, index) => {
            const x = this.sampleX(index, count);
            const waves = morph < 1 && strength > 0 ? strength * this.downloadSwing(x, span) : 0;
            const waveform = morph > 0 && scene.peaks ? this.waveformSwing(x, scene.peaks) : 0;
            return waves + (waveform - waves) * morph;
        });
    }

    private downloadSwing(x: number, span: number): number {
        if (x >= span) {
            return 0;
        }
        return fadeAtEnds(x, span, DOWNLOAD_FADE) * swellAt(x, this.travelSeconds) * this.height * DOWNLOAD_SWING_SHARE;
    }

    private waveformSwing(x: number, peaks: readonly number[]): number {
        return loudnessAt(peaks, x / this.width) * fadeAtEnds(x, this.width, WAVEFORM_FADE) * this.height * WAVEFORM_SWING_SHARE;
    }

    /** How strongly the download waves swing: rising after the download starts, and none before it. */
    private downloadStrength(scene: WaveformScene, now: number): number {
        if (scene.state === 'not-loaded' || scene.state === 'failed') {
            return 0;
        }
        return this.downloadStartedAt === null ? 1 : easeOutCubic(clamp((now - this.downloadStartedAt) / ATTACK_MS));
    }

    private sampleX(index: number, count: number): number {
        return (index / (count - 1)) * this.width;
    }

    private morph(now: number): number {
        if (this.morphStartsAt === null) {
            return 0;
        }
        return clamp((now - this.morphStartsAt) / MORPH_DURATION_MS);
    }

    /** Where the accent ink ends: the downloaded share while downloading, then the play position, reached by a glide during the morph when the transfer was shown. */
    private fillEnd(scene: WaveformScene, now: number): number {
        switch (scene.state) {
            case 'not-loaded':
            case 'failed':
                return 0;
            case 'downloading':
                return scene.transferShown ? (scene.progress ?? 0) : 0;
            default: {
                const position = this.shownPosition(scene, now);
                const origin = scene.transferShown ? 1 : position;
                return origin + (position - origin) * easeInOutCubic(this.morph(now));
            }
        }
    }

    /**
     * The play position, carried forward between the element's sparse time updates while playing.
     * It holds still from the start of playback until the element first reports a moved position,
     * since audio start latency keeps the element's clock at rest while the card already plays.
     */
    private shownPosition(scene: WaveformScene, now: number): number {
        if (scene.state !== 'playing' || !scene.lengthSeconds || this.positionAnchor.at === null) {
            return scene.position;
        }
        return Math.min(1, this.positionAnchor.position + (now - this.positionAnchor.at) / 1000 / scene.lengthSeconds);
    }

    private seekable(scene: WaveformScene): boolean {
        return scene.state === 'ready' || scene.state === 'playing';
    }
}

/** Smoothly interpolated loudness at a 0 to 1 point, each peak standing at the middle of its slice. */
function loudnessAt(peaks: readonly number[], fraction: number): number {
    const count = peaks.length;
    if (count === 0) {
        return 0;
    }
    const position = clamp(fraction) * count - 0.5;
    const index = Math.floor(position);
    const peakAt = (at: number): number => peaks[Math.min(count - 1, Math.max(0, at))] ?? 0;
    return clamp(catmullRom(peakAt(index - 1), peakAt(index), peakAt(index + 1), peakAt(index + 2), position - index));
}

function catmullRom(before: number, from: number, to: number, after: number, along: number): number {
    return (
        0.5 *
        (2 * from + (to - before) * along + (2 * before - 5 * from + 4 * to - after) * along ** 2 + (3 * from - before - 3 * to + after) * along ** 3)
    );
}
