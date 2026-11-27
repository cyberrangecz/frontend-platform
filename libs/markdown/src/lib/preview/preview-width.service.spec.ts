import { describe, expect, it } from 'vitest';
import { clampPercent, percentForPointer } from './preview-width.service';

describe('preview width', () => {
    it('widens symmetrically with the distance of the pointer from the centre', () => {
        expect(percentForPointer(750, 500, 1000)).toBe(50);
        expect(percentForPointer(250, 500, 1000)).toBe(50);
    });

    it('keeps the width within its bounds', () => {
        expect(clampPercent(5)).toBe(30);
        expect(clampPercent(250)).toBe(100);
        expect(clampPercent(61.234)).toBe(61.2);
    });
});
