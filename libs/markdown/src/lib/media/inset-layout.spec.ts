import { describe, expect, it } from 'vitest';
import { fitsInsetLayout, isInset } from './inset-layout';

const NEEDED = { width: 160, height: 112 };

describe('fitsInsetLayout', () => {
    it('keeps the inset layout for a card shown at or above the needed size', () => {
        expect(fitsInsetLayout({ width: 160, height: 112 }, NEEDED)).toBe(true);
        expect(fitsInsetLayout({ width: 640, height: 360 }, NEEDED)).toBe(true);
    });

    it('moves a card shown narrower than needed outside', () => {
        expect(fitsInsetLayout({ width: 159, height: 360 }, NEEDED)).toBe(false);
    });

    it('moves a card shown shorter than needed outside, however wide it is', () => {
        expect(fitsInsetLayout({ width: 640, height: 111 }, NEEDED)).toBe(false);
    });

    it('moves a card shown narrower and shorter than needed outside', () => {
        expect(fitsInsetLayout({ width: 166, height: 93 }, NEEDED)).toBe(false);
    });

    it('gives the inset layout while the shown or needed size is not measured', () => {
        expect(fitsInsetLayout(null, NEEDED)).toBe(true);
        expect(fitsInsetLayout({ width: 10, height: 10 }, null)).toBe(true);
    });
});

describe('isInset', () => {
    it('follows the policy: never, always, or the shown size', () => {
        expect(isInset('never', { width: 640, height: 360 }, NEEDED)).toBe(false);
        expect(isInset('always', { width: 10, height: 10 }, NEEDED)).toBe(true);
        expect(isInset('when-fits', { width: 159, height: 360 }, NEEDED)).toBe(false);
        expect(isInset('when-fits', { width: 160, height: 112 }, NEEDED)).toBe(true);
    });
});
