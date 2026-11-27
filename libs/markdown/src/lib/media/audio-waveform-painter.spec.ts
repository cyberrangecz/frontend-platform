import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioWaveformPainter, WaveformScene } from './audio-waveform-painter';

const CANVAS_WIDTH = 284;
const LENGTH_SECONDS = 8;

class FakeResizeObserver {
    constructor(private readonly callback: (entries: { contentRect: { width: number; height: number } }[]) => void) {}

    observe(): void {
        this.callback([{ contentRect: { width: CANVAS_WIDTH, height: 40 } }]);
    }

    disconnect(): void {}
}

describe('AudioWaveformPainter played line', () => {
    let clock = 0;
    let pendingFrame: ((now: number) => void) | null = null;
    let playheadPositions: number[] = [];
    let painter: AudioWaveformPainter;

    const scene = (state: WaveformScene['state'], position: number): WaveformScene => ({
        state,
        progress: 1,
        peaks: [0.5, 0.5],
        position,
        lengthSeconds: LENGTH_SECONDS,
        transferShown: false,
    });

    /** Advances the fake clock to the given time and draws the frame there, returning the played line's x. */
    const frameAt = (time: number): number => {
        clock = time;
        pendingFrame?.(time);
        return playheadPositions.at(-1) ?? 0;
    };

    beforeEach(() => {
        const context = new Proxy(
            { moveTo: (x: number) => playheadPositions.push(x) },
            { get: (target, name) => (target as Record<string | symbol, unknown>)[name] ?? (() => undefined), set: () => true },
        );
        const canvas = { getContext: () => context, addEventListener: vi.fn(), width: 0, height: 0 } as unknown as HTMLCanvasElement;
        vi.stubGlobal('ResizeObserver', FakeResizeObserver);
        vi.stubGlobal('Path2D', class { moveTo(): void {} lineTo(): void {} });
        vi.stubGlobal('devicePixelRatio', 1);
        vi.stubGlobal('getComputedStyle', () => ({ color: 'red', borderTopColor: 'grey' }));
        vi.stubGlobal('requestAnimationFrame', (callback: (now: number) => void) => {
            pendingFrame = callback;
            return 1;
        });
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
        vi.spyOn(performance, 'now').mockImplementation(() => clock);
        clock = 0;
        playheadPositions = [];
        painter = new AudioWaveformPainter(canvas);
        painter.update(scene('ready', 0));
        frameAt(0);
    });

    afterEach(() => {
        painter.destroy();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('never moves backwards on the first play, while the element clock lags the playing state', () => {
        clock = 100;
        painter.update(scene('playing', 0));
        const sampled: number[] = [];
        for (let time = 100; time <= 340; time += 20) {
            sampled.push(frameAt(time));
        }
        clock = 360;
        painter.update(scene('playing', 0.1 / LENGTH_SECONDS));
        for (let time = 360; time <= 700; time += 20) {
            sampled.push(frameAt(time));
        }
        for (let index = 1; index < sampled.length; index++) {
            expect(sampled[index]).toBeGreaterThanOrEqual(sampled[index - 1] as number);
        }
        expect(sampled.at(-1)).toBeGreaterThan(0);
    });

    it('lets a seek during playback move the line backwards', () => {
        clock = 0;
        painter.update(scene('playing', 0.5));
        frameAt(0);
        clock = 50;
        painter.update(scene('playing', 0.1));
        expect(frameAt(50)).toBeLessThan(0.5 * CANVAS_WIDTH);
    });
});
