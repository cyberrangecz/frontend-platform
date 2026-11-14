import { MediaCardState } from '../attachment/media-playback';
import { CanvasPainter } from './canvas-painter';
import { approach, clamp, easeInOutCubic, easeOutCubic, fadeAtEnds, smoothStep, STRANDS, strandSwingAt, swellAt } from './media-strands';

/** What a video card's download strands show at one moment. */
export interface VideoStrandsScene {
    readonly state: MediaCardState;
    /** Downloaded fraction from 0 to 1, or null while the total is unknown. */
    readonly progress: number | null;
    /** Playback position as a fraction of the length. */
    readonly position: number;
    readonly lengthSeconds: number | null;
}

/** A horizontal line on the canvas, in CSS pixels from its top left corner. */
export interface StrandsLine {
    readonly left: number;
    readonly right: number;
    /** Vertical centre of the line. */
    readonly middle: number;
    readonly thickness: number;
}

/** Pixels above the bottom edge the strands run along while the file downloads. */
const DOWNLOAD_LINE_INSET = 22;
const DOWNLOAD_LINE_THICKNESS = 1.5;
/** Pixels the strands swing out from their line at full strength. */
const SWING = 8;
/** Pixels over which the strands fade into their line at both ends of their range. */
const STRAND_FADE = 42;
const SAMPLE_SPACING = 1.5;
/** Height of the shade behind the strands that keeps them legible over a bright poster. */
const SHADE_HEIGHT = 84;
const SHADE_ALPHA = 0.6;
const ATTACK_MS = 500;
/** Time constant by which the strands' reach follows the downloaded share. */
const REACH_EASE_MS = 280;
/** Time constant by which the reach closes the last stretch once the file has arrived, so the collapse follows promptly. */
const COMPLETION_REACH_EASE_MS = 110;
/** Time constant by which the strands turn from the pale unknown-size look to the downloaded share. */
const UNKNOWN_EASE_MS = 360;
/** Reach from which an arrived file starts collapsing, so the strands visibly arrive at the end first. */
const COLLAPSE_START_REACH = 0.995;
const COLLAPSE_DURATION_MS = 1300;
/** Share of the collapse after which the played fill starts gliding from the downloaded end to the play position. */
const FILL_GLIDE_START = 0.35;
/** Longest frame step the animation advances by, so a frame after a stall does not jump. */
const MAX_FRAME_STEP_MS = 100;

/**
 * Draws a video card's download as the audio card's layered strings running along the bottom of
 * the poster, under a shade that keeps them legible. While the file downloads, waves travel along
 * the downloaded stretch in the played ink, fading into a flat line in the track ink that marks
 * the stretch still to come; while the total is unknown they travel pale along the whole width.
 * Once the file has arrived, the strings come to rest and collapse onto the playback bar's track:
 * the line moves onto it and takes its length and thickness, and the played stretch glides from
 * the downloaded end back to the play position. The last frame matches the track, and the painter
 * then reports the bar formed. Reads its inks from the canvas's computed `color` (played),
 * `border-top-color` (track) and `outline-color` (shade).
 */
export class VideoStrandsPainter extends CanvasPainter {
    private scene: VideoStrandsScene | null = null;
    private downloadStartedAt: number | null = null;
    private lastFrameAt: number | null = null;
    private travelSeconds = 0;
    /** Share of the width the downloaded strands reach, easing toward the downloaded share. */
    private reach = 0;
    /** 1 while the total is unknown, easing to 0 once it is known. */
    private unknown = 1;
    private collapseStartsAt: number | null = null;
    private formed = false;
    private track: StrandsLine | null = null;
    private positionAnchor = { position: 0, at: 0 };
    private inks = { played: '', track: '', shade: '' };

    /**
     * @param canvas The canvas laid over the video frame.
     * @param measureTrack Reads where the playback bar's track lies on the canvas, or null while there is no bar.
     * @param barFormed Called once the strands have collapsed into the playback bar's track.
     */
    constructor(
        canvas: HTMLCanvasElement,
        private readonly measureTrack: () => StrandsLine | null,
        private readonly barFormed: () => void,
    ) {
        super(canvas);
    }

    /** Moves to a new scene; a download starting again rewinds every animation value. */
    update(next: VideoStrandsScene): void {
        const now = performance.now();
        if (next.state === 'downloading' && this.scene?.state !== 'downloading') {
            this.rewind(now);
        }
        if (next.position !== this.scene?.position) {
            this.positionAnchor = { position: next.position, at: now };
        }
        this.scene = next;
        this.readInks();
        this.requestFrame();
    }

    protected override resized(): void {
        this.readInks();
    }

    protected override rested(): void {
        this.lastFrameAt = null;
    }

    protected animating(): boolean {
        const state = this.scene?.state;
        return state === 'downloading' || ((state === 'ready' || state === 'playing') && !this.formed);
    }

    protected draw(now: number): void {
        const { context, width, height, scene } = this;
        context.clearRect(0, 0, width, height);
        if (!scene || width === 0 || height === 0 || scene.state === 'not-loaded' || scene.state === 'failed') {
            return;
        }
        this.advance(scene, now);
        const collapse = this.collapse(now);
        const settled = easeInOutCubic(collapse);
        const activity = this.activity(now);
        const line = this.lineAt(settled);
        const downloaded = this.reach * (1 - this.unknown);
        const glide = easeInOutCubic(smoothStep((collapse - FILL_GLIDE_START) / (1 - FILL_GLIDE_START)));
        const played = downloaded + (this.shownPosition(scene, now) - downloaded) * glide;
        const xAt = (fraction: number): number => line.left + fraction * (line.right - line.left);
        const swing = SWING * activity * (1 - settled);

        this.paintShade(SHADE_ALPHA * activity * (1 - settled));
        this.paintLine(line, line.right, this.inks.track, towardOne(activity, settled));
        this.paintLine(line, xAt(played), this.inks.played, towardOne(activity * (1 - this.unknown), settled));
        this.paintStrands(line, xAt(downloaded), swing, this.inks.played, 1 - this.unknown);
        this.paintStrands(line, line.right, swing, this.inks.track, this.unknown);

        if (collapse >= 1 && !this.formed) {
            this.formed = true;
            this.barFormed();
        }
    }

    private rewind(now: number): void {
        this.downloadStartedAt = now;
        this.lastFrameAt = null;
        this.travelSeconds = 0;
        this.reach = 0;
        this.unknown = 1;
        this.collapseStartsAt = null;
        this.formed = false;
    }

    private readInks(): void {
        const style = getComputedStyle(this.canvas);
        this.inks = { played: style.color, track: style.borderTopColor, shade: style.outlineColor };
    }

    /**
     * Advances by the time since the last frame: the reach eases toward the downloaded share, the
     * whole width once the file has arrived, and the crests travel on, slowing to a stop as the
     * strands collapse. The collapse starts once the reach has arrived and the bar's track is there.
     */
    private advance(scene: VideoStrandsScene, now: number): void {
        const step = Math.min(MAX_FRAME_STEP_MS, now - (this.lastFrameAt ?? now));
        this.lastFrameAt = now;
        if (scene.state === 'downloading') {
            this.reach = approach(this.reach, scene.progress ?? 0, step, REACH_EASE_MS);
            this.unknown = approach(this.unknown, scene.progress === null ? 1 : 0, step, UNKNOWN_EASE_MS);
        } else {
            this.reach = approach(this.reach, 1, step, COMPLETION_REACH_EASE_MS);
            this.unknown = approach(this.unknown, 0, step, UNKNOWN_EASE_MS);
            this.track = this.measureTrack() ?? this.track;
            if (this.collapseStartsAt === null && this.track && this.reach >= COLLAPSE_START_REACH) {
                this.collapseStartsAt = now;
            }
        }
        this.travelSeconds += (step / 1000) * (1 - easeOutCubic(this.collapse(now)));
    }

    /** The strands' line, moving from the download line along the bottom edge onto the playback bar's track as they collapse. */
    private lineAt(settled: number): StrandsLine {
        const download: StrandsLine = {
            left: 0,
            right: this.width,
            middle: this.height - DOWNLOAD_LINE_INSET,
            thickness: DOWNLOAD_LINE_THICKNESS,
        };
        const target = this.track ?? download;
        const between = (from: number, to: number): number => from + (to - from) * settled;
        return {
            left: between(download.left, target.left),
            right: between(download.right, target.right),
            middle: between(download.middle, target.middle),
            thickness: between(download.thickness, target.thickness),
        };
    }

    private paintShade(alpha: number): void {
        if (alpha <= 0.001) {
            return;
        }
        const { context, width, height } = this;
        const shade = context.createLinearGradient(0, height - SHADE_HEIGHT, 0, height);
        shade.addColorStop(0, 'transparent');
        shade.addColorStop(1, this.inks.shade);
        context.save();
        context.globalAlpha = alpha;
        context.fillStyle = shade;
        context.fillRect(0, height - SHADE_HEIGHT, width, SHADE_HEIGHT);
        context.restore();
    }

    /** The line with rounded ends across its whole length, shown from its left end up to the given point. */
    private paintLine(line: StrandsLine, end: number, ink: string, alpha: number): void {
        if (alpha <= 0.001 || end <= line.left) {
            return;
        }
        const { context } = this;
        const capInset = Math.min(line.thickness / 2, (line.right - line.left) / 2);
        context.save();
        context.beginPath();
        context.rect(line.left, 0, end - line.left, this.height);
        context.clip();
        context.globalAlpha = alpha;
        context.strokeStyle = ink;
        context.lineWidth = line.thickness;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(line.left + capInset, line.middle);
        context.lineTo(line.right - capInset, line.middle);
        context.stroke();
        context.restore();
    }

    /** The strings along the line from its left end to the given point, fading into the line at both ends. */
    private paintStrands(line: StrandsLine, end: number, swing: number, ink: string, strength: number): void {
        const span = end - line.left;
        if (strength <= 0.001 || swing <= 0.05 || span <= 1) {
            return;
        }
        const { context } = this;
        context.save();
        context.strokeStyle = ink;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        for (const strand of STRANDS) {
            context.globalAlpha = strand.alpha * strength;
            context.lineWidth = strand.lineWidth;
            context.beginPath();
            for (let along = 0; along <= span + SAMPLE_SPACING; along += SAMPLE_SPACING) {
                const x = Math.min(along, span);
                const envelope = fadeAtEnds(x, span, STRAND_FADE) * swellAt(x, this.travelSeconds);
                const y = line.middle + swing * envelope * strandSwingAt(strand, x, 0, 1, this.travelSeconds);
                if (along === 0) {
                    context.moveTo(line.left + x, y);
                } else {
                    context.lineTo(line.left + x, y);
                }
            }
            context.stroke();
        }
        context.restore();
    }

    /** How strongly the download shows: rising after the download starts, and none for a file that arrived without one. */
    private activity(now: number): number {
        return this.downloadStartedAt === null ? 0 : easeOutCubic(clamp((now - this.downloadStartedAt) / ATTACK_MS));
    }

    private collapse(now: number): number {
        return this.collapseStartsAt === null ? 0 : clamp((now - this.collapseStartsAt) / COLLAPSE_DURATION_MS);
    }

    /** The play position, carried forward between the element's sparse time updates while playing. */
    private shownPosition(scene: VideoStrandsScene, now: number): number {
        if (scene.state !== 'playing' || !scene.lengthSeconds) {
            return scene.position;
        }
        return Math.min(1, this.positionAnchor.position + (now - this.positionAnchor.at) / 1000 / scene.lengthSeconds);
    }
}

/** A value carried to 1 as the given share rises from 0 to 1. */
function towardOne(value: number, share: number): number {
    return value + (1 - value) * share;
}
