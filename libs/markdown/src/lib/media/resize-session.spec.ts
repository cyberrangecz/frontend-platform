import { describe, expect, it } from 'vitest';
import { moveSessionTo, startSession, widthAfterKey, widthAfterPointer } from './resize-session';

const LIMITS = { minimum: 200, maximum: 800 };
const OPEN_LIMITS = { minimum: 200, maximum: Number.POSITIVE_INFINITY };

describe('startSession', () => {
    it('rounds a fractional starting width, so a readout never shows a fraction', () => {
        expect(startSession(532.5, LIMITS)).toStrictEqual({ start: 533, limits: LIMITS, current: 533 });
    });

    it('brings a starting width outside the limits into them', () => {
        expect(startSession(100, LIMITS).current).toBe(200);
        expect(startSession(1200, LIMITS).current).toBe(800);
    });
});

describe('moveSessionTo', () => {
    it('keeps the start and clamps the reached width', () => {
        const session = startSession(400, LIMITS);
        expect(moveSessionTo(session, 5000)).toStrictEqual({ ...session, current: 800 });
    });
});

describe('widthAfterKey', () => {
    const session = startSession(400, LIMITS);

    it('steps by the small step, or the large one with Shift', () => {
        expect(widthAfterKey(session, 'ArrowRight', false)).toBe(416);
        expect(widthAfterKey(session, 'ArrowUp', true)).toBe(464);
        expect(widthAfterKey(session, 'ArrowLeft', false)).toBe(384);
        expect(widthAfterKey(session, 'ArrowDown', true)).toBe(336);
    });

    it('jumps to the limits with Home and End', () => {
        expect(widthAfterKey(session, 'Home', false)).toBe(200);
        expect(widthAfterKey(session, 'End', false)).toBe(800);
    });

    it('does nothing on End while the maximum is open, never reaching an infinite width', () => {
        expect(widthAfterKey(startSession(400, OPEN_LIMITS), 'End', false)).toBeNull();
    });

    it('ignores other keys', () => {
        expect(widthAfterKey(session, 'a', false)).toBeNull();
    });
});

describe('widthAfterPointer', () => {
    const session = startSession(400, LIMITS);

    it('follows horizontal movement alone when the height per width is unknown', () => {
        expect(widthAfterPointer(session, 50, 300, 0)).toBe(450);
    });

    it('projects both axes onto the diagonal of a square card', () => {
        expect(widthAfterPointer(session, 40, 40, 1)).toBe(440);
        expect(widthAfterPointer(session, 40, -40, 1)).toBe(400);
    });

    it('lets a vertical drag alone grow or shrink the card along its ratio', () => {
        expect(widthAfterPointer(session, 0, 50, 0.5)).toBe(420);
        expect(widthAfterPointer(session, 0, -50, 0.5)).toBe(380);
    });
});
