import { describe, expect, it } from 'vitest';
import { formatDuration, lengthLabelOf } from './attachment-kind';
import { computePeaks } from './audio-peaks';
import { placeholderColorsOf } from './placeholder-colors';

describe('audio and video card logic', () => {
    it('scales peaks so the loudest bar is 1', () => {
        const peaks = computePeaks([Float32Array.from([0.1, -0.2, 0.05, 0.4])], 2);
        expect(peaks).toEqual([0.5, 1]);
    });

    it('returns flat bars for empty samples', () => {
        expect(computePeaks([new Float32Array(0)], 3)).toEqual([0, 0, 0]);
    });

    it('derives the same placeholder colours from a hash every time', () => {
        expect(placeholderColorsOf('abc123')).toEqual(placeholderColorsOf('abc123'));
        expect(placeholderColorsOf('abc123')).not.toEqual(placeholderColorsOf('abc124'));
    });

    it('formats durations', () => {
        expect(formatDuration(65)).toBe('1:05');
        expect(formatDuration(3725)).toBe('1:02:05');
    });

    it('shows the size in place of the length without metadata', () => {
        const base = { hash: 'h', fileName: 'a.mp3', mediaType: 'audio/mpeg', size: 2048 };
        expect(lengthLabelOf(base)).toBe('2 KiB');
        expect(lengthLabelOf({ ...base, durationSeconds: 90 })).toBe('1:30');
    });
});
