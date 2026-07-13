import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWatermarkFresh, getSinceTimestamp } from './watermark-freshness';
import { WatermarkEntry } from '../../cache/cache.interface';

describe('isWatermarkFresh', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns false when watermark is undefined', () => {
        expect(isWatermarkFresh(undefined)).toBe(false);
    });

    it('returns true when watermark is fresh (less than 1 second old)', () => {
        vi.useFakeTimers();
        const now = Date.now();
        const watermark: WatermarkEntry = {
            instanceId: 1,
            eventType: 'TrainingStarted',
            maxTimestamp: now,
            lastSynced: now,
        };
        expect(isWatermarkFresh(watermark)).toBe(true);
    });

    it('returns false when watermark is stale (1 second or older)', () => {
        vi.useFakeTimers();
        const now = Date.now();
        const watermark: WatermarkEntry = {
            instanceId: 1,
            eventType: 'TrainingStarted',
            maxTimestamp: now - 1000,
            lastSynced: now - 1000,
        };
        expect(isWatermarkFresh(watermark)).toBe(false);
    });
});

describe('getSinceTimestamp', () => {
    it('returns 0 when watermark is undefined', () => {
        expect(getSinceTimestamp(undefined)).toBe(0);
    });

    it('returns maxTimestamp minus 500ms buffer', () => {
        const watermark: WatermarkEntry = {
            instanceId: 1,
            eventType: 'TrainingStarted',
            maxTimestamp: 1000,
            lastSynced: Date.now(),
        };
        expect(getSinceTimestamp(watermark)).toBe(500);
    });

    it('clamps result to 0 when maxTimestamp is less than 500ms', () => {
        const watermark: WatermarkEntry = {
            instanceId: 1,
            eventType: 'TrainingStarted',
            maxTimestamp: 300,
            lastSynced: Date.now(),
        };
        expect(getSinceTimestamp(watermark)).toBe(0);
    });
});
