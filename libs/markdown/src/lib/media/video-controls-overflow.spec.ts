import { describe, expect, it } from 'vitest';
import { visibleButtonCount } from './video-controls-overflow';

describe('visibleButtonCount', () => {
    it('shows every button when they all fit', () => {
        expect(visibleButtonCount(150, 40, 5, 3)).toBe(3);
    });

    it('reserves one slot for the overflow button when they do not all fit', () => {
        expect(visibleButtonCount(100, 40, 5, 3)).toBe(1);
    });

    it('moves every button into the overflow when only its own slot is left', () => {
        expect(visibleButtonCount(50, 40, 5, 3)).toBe(0);
    });

    it('never goes below zero', () => {
        expect(visibleButtonCount(10, 40, 5, 3)).toBe(0);
    });
});
