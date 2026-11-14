import { describe, expect, it } from 'vitest';
import { chipDetailOf } from './attachment-kind';

describe('chipDetailOf', () => {
    it('appends the saved width after the size', () => {
        expect(chipDetailOf('2.2 KiB', 480)).toBe('2.2 KiB · max 480 px');
    });

    it('leaves the size alone without a saved width', () => {
        expect(chipDetailOf('2.2 KiB', undefined)).toBe('2.2 KiB');
    });
});
