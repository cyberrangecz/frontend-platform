import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSinceTimestamp, isWatermarkFresh } from './watermark-freshness';
import { WatermarkEntry } from '../../cache/cache.interface';

describe('isWatermarkFresh', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-06-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns false when the watermark is undefined', () => {
        expect(isWatermarkFresh(undefined)).toBe(false);
    });

    it('returns true when lastSynced is now (clearly inside the 1-second window)', () => {
        const watermark: WatermarkEntry = {
            instanceId: 1,
            eventType: 'any',
            maxTimestamp: 0,
            lastSynced: Date.now(),
        };
        expect(isWatermarkFresh(watermark)).toBe(true);
    });

    it('returns false when lastSynced is far in the past (clearly outside the 1-second window)', () => {
        const watermark: WatermarkEntry = {
            instanceId: 1,
            eventType: 'any',
            maxTimestamp: 0,
            lastSynced: Date.now() - 60_000,
        };
        expect(isWatermarkFresh(watermark)).toBe(false);
    });
});

describe('getSinceTimestamp', () => {
    it('returns exactly 0 when the watermark is undefined (full fetch)', () => {
        expect(getSinceTimestamp(undefined)).toBe(0);
    });

    it('returns a value within (0, maxTimestamp] when a watermark is present (overlap, no exact offset asserted)', () => {
        const maxTimestamp = 1_000_000;
        const watermark: WatermarkEntry = {
            instanceId: 1,
            eventType: 'any',
            maxTimestamp,
            lastSynced: 0,
        };
        const since = getSinceTimestamp(watermark);
        expect(since).toBeGreaterThan(0);
        expect(since).toBeLessThanOrEqual(maxTimestamp);
    });
});
