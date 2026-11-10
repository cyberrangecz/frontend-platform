import { describe, expect, it } from 'vitest';
import { coveringSpan, draggedSelection, grownSelection, neighbourOf } from './block-selection';

const blocks = [
    { start: 0, end: 3 },
    { start: 7, end: 10 },
    { start: 14, end: 20 },
];

describe('block selection', () => {
    it('covers two spans with the blank lines between them', () => {
        expect(coveringSpan(blocks[0], blocks[2])).toEqual({ start: 0, end: 20 });
    });

    it('finds the neighbouring block in each direction', () => {
        expect(neighbourOf(blocks, blocks[1], 'previous')).toBe(blocks[0]);
        expect(neighbourOf(blocks, blocks[1], 'next')).toBe(blocks[2]);
        expect(neighbourOf(blocks, blocks[0], 'previous')).toBeUndefined();
        expect(neighbourOf(blocks, blocks[2], 'next')).toBeUndefined();
    });

    it('keeps the anchor in place and moves the head to the grown edge', () => {
        expect(grownSelection({ anchor: 1, head: 3 }, 7, { start: 7, end: 20 }, 'next')).toEqual({ anchor: 1, head: 13 });
        expect(grownSelection({ anchor: 2, head: 0 }, 7, { start: 0, end: 10 }, 'previous')).toEqual({ anchor: 9, head: 0 });
    });

    it('selects whole blocks from a drag, forward and backward', () => {
        const covering = coveringSpan(blocks[0], blocks[2]);
        expect(draggedSelection(blocks[0], blocks[2], covering)).toEqual({ anchor: 0, head: 20 });
        expect(draggedSelection(blocks[2], blocks[0], covering)).toEqual({ anchor: 20, head: 0 });
    });
});
