import { WatermarkEntry } from '../../cache/cache.interface';

const FRESHNESS_WINDOW_MS = 1000;
const SINCE_TIMESTAMP_BUFFER_MS = 500;

export function isWatermarkFresh(watermark: WatermarkEntry | undefined): boolean {
    if (!watermark) return false;
    return Date.now() - watermark.lastSynced < FRESHNESS_WINDOW_MS;
}

export function getSinceTimestamp(watermark: WatermarkEntry | undefined): number {
    if (!watermark) return 0;
    return Math.max(0, watermark.maxTimestamp - SINCE_TIMESTAMP_BUFFER_MS);
}
