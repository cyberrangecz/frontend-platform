import { describe, expect, it } from 'vitest';
import {
    aspectRatioOf,
    capToColumn,
    clampWidth,
    DOWNLOAD_BUTTON_MARGIN_PIXELS,
    hasKnownDimensions,
    heightPerWidthOf,
    imageSizeLimits,
    MAXIMUM_SCALE,
    shownWidthOf,
    typedWidthOf,
    VIDEO_MINIMUM_WIDTH_PIXELS,
    videoSizeLimits,
} from './media-size-limits';

const BUTTON = { width: 140, height: 40 };
const BUTTON_WIDTH_WITH_MARGIN = BUTTON.width + 2 * DOWNLOAD_BUTTON_MARGIN_PIXELS;

describe('imageSizeLimits', () => {
    it('allows up to twice the stored width', () => {
        expect(imageSizeLimits({ width: 800, height: 600 }, BUTTON).maximum).toBe(MAXIMUM_SCALE * 800);
    });

    it('keeps the download button and its margin inside the narrowest frame', () => {
        expect(imageSizeLimits({ width: 800, height: 600 }, BUTTON).minimum).toBe(BUTTON_WIDTH_WITH_MARGIN);
    });

    it('widens the narrowest frame of a wide, flat picture so the button keeps its height margin', () => {
        const { minimum } = imageSizeLimits({ width: 2000, height: 100 }, BUTTON);
        const heightForButton = BUTTON.height + 2 * DOWNLOAD_BUTTON_MARGIN_PIXELS;
        expect(minimum).toBe((heightForButton * 2000) / 100);
    });

    it('takes the own width of a tiny image as both limits it cannot go below, never inverting them', () => {
        const limits = imageSizeLimits({ width: 40, height: 30 }, BUTTON);
        expect(limits.minimum).toBe(40);
        expect(limits.maximum).toBe(80);
    });

    it('leaves the maximum open while the stored width is unknown', () => {
        expect(imageSizeLimits({}, BUTTON)).toEqual({ minimum: BUTTON_WIDTH_WITH_MARGIN, maximum: Number.POSITIVE_INFINITY });
    });
});

describe('videoSizeLimits', () => {
    it('starts at the playback bar minimum and ends at twice the stored width', () => {
        expect(videoSizeLimits({ width: 1280 })).toEqual({ minimum: VIDEO_MINIMUM_WIDTH_PIXELS, maximum: 2560 });
    });

    it('raises the maximum of a tiny video to the minimum, so the range is never inverted', () => {
        const limits = videoSizeLimits({ width: 100 });
        expect(MAXIMUM_SCALE * 100).toBeLessThan(VIDEO_MINIMUM_WIDTH_PIXELS);
        expect(limits).toEqual({ minimum: VIDEO_MINIMUM_WIDTH_PIXELS, maximum: VIDEO_MINIMUM_WIDTH_PIXELS });
    });
});

describe('clampWidth', () => {
    it('scales a tiny video up to the minimum, whatever width is asked for', () => {
        const limits = videoSizeLimits({ width: 100 });
        expect(clampWidth(100, limits)).toBe(VIDEO_MINIMUM_WIDTH_PIXELS);
        expect(clampWidth(150, limits)).toBe(VIDEO_MINIMUM_WIDTH_PIXELS);
    });

    it('brings a hand-written width outside the range into it', () => {
        const limits = videoSizeLimits({ width: 1000 });
        expect(clampWidth(5, limits)).toBe(VIDEO_MINIMUM_WIDTH_PIXELS);
        expect(clampWidth(99999, limits)).toBe(2000);
        expect(clampWidth(700.4, limits)).toBe(700);
    });

    it('keeps a tiny image between its own width and twice it', () => {
        const limits = imageSizeLimits({ width: 40, height: 30 }, BUTTON);
        expect(clampWidth(10, limits)).toBe(40);
        expect(clampWidth(500, limits)).toBe(80);
    });
});

describe('clampWidth with an open maximum', () => {
    it('returns a finite width, never an infinite one', () => {
        const limits = imageSizeLimits({}, BUTTON);
        expect(clampWidth(Number.POSITIVE_INFINITY, limits)).toBe(BUTTON_WIDTH_WITH_MARGIN);
        expect(clampWidth(Number.NaN, limits)).toBe(BUTTON_WIDTH_WITH_MARGIN);
        expect(clampWidth(900, limits)).toBe(900);
    });
});

describe('whole-pixel limits', () => {
    it('rounds a fractional minimum up, so a card never goes below what it needs', () => {
        const { minimum } = imageSizeLimits({ width: 2000, height: 100 }, BUTTON);
        expect(Number.isInteger(minimum)).toBe(true);
    });

    it('keeps the maximum at the minimum when rounding inwards would cross them', () => {
        expect(capToColumn({ minimum: 351.5, maximum: 351.5 }, 351)).toStrictEqual({ minimum: 352, maximum: 352 });
    });

    it('rounds a column cap down to whole px', () => {
        expect(capToColumn({ minimum: 200, maximum: 800 }, 500.7).maximum).toBe(500);
    });
});

describe('dimensions', () => {
    it('knows them only when width and height are both stored', () => {
        expect(hasKnownDimensions({ width: 800, height: 600 })).toBe(true);
        expect(hasKnownDimensions({ width: 800 })).toBe(false);
        expect(hasKnownDimensions({})).toBe(false);
    });

    it('writes the aspect ratio only when they are known', () => {
        expect(aspectRatioOf({ width: 800, height: 600 })).toBe('800 / 600');
        expect(aspectRatioOf({ width: 800 })).toBeNull();
    });

    it('gives the height per width, or 0 when they are not both stored', () => {
        expect(heightPerWidthOf({ width: 800, height: 600 })).toBe(0.75);
        expect(heightPerWidthOf({ width: 800 })).toBe(0);
    });
});

describe('capToColumn', () => {
    const limits = { minimum: 200, maximum: 800 };

    it('holds the maximum to the column width', () => {
        expect(capToColumn(limits, 500)).toStrictEqual({ minimum: 200, maximum: 500 });
    });

    it('leaves a maximum narrower than the column, and an open maximum under it', () => {
        expect(capToColumn(limits, 1200)).toStrictEqual(limits);
        expect(capToColumn({ minimum: 200, maximum: Number.POSITIVE_INFINITY }, 600).maximum).toBe(600);
    });

    it('never takes the maximum below the minimum, however narrow the column is', () => {
        expect(capToColumn(limits, 120)).toStrictEqual({ minimum: 200, maximum: 200 });
    });

    it('leaves the limits alone while the column width is unknown', () => {
        expect(capToColumn(limits, null)).toBe(limits);
    });
});

describe('shownWidthOf', () => {
    const limits = videoSizeLimits({ width: 1000 });

    it('prefers the saved width over the stored one', () => {
        expect(shownWidthOf(640, { width: 1000, height: 500 }, limits)).toBe(640);
    });

    it('falls back to the stored width when its dimensions are known', () => {
        expect(shownWidthOf(undefined, { width: 1000, height: 500 }, limits)).toBe(1000);
    });

    it('has no width when none is saved and the stored dimensions are incomplete', () => {
        expect(shownWidthOf(undefined, { width: 1000 }, limits)).toBeNull();
    });

    it('brings a saved or stored width into the limits once they are known', () => {
        expect(shownWidthOf(99999, { width: 1000, height: 500 }, limits)).toBe(2000);
        expect(shownWidthOf(undefined, { width: 100, height: 50 }, videoSizeLimits({ width: 100 }))).toBe(VIDEO_MINIMUM_WIDTH_PIXELS);
    });

    it('leaves a saved width as written while the limits are unknown', () => {
        expect(shownWidthOf(99999, { width: 1000, height: 500 }, null)).toBe(99999);
    });
});

describe('typedWidthOf', () => {
    const limits = videoSizeLimits({ width: 1000 });

    it('saves a typed width inside the limits as typed, rounded to whole px', () => {
        expect(typedWidthOf('640', limits)).toBe(640);
        expect(typedWidthOf(' 640.6 ', limits)).toBe(641);
    });

    it('brings a typed width outside the limits to the nearest limit, and keeps one between them', () => {
        expect(typedWidthOf('12', limits)).toBe(VIDEO_MINIMUM_WIDTH_PIXELS);
        expect(typedWidthOf('99999', limits)).toBe(MAXIMUM_SCALE * 1000);
        expect(typedWidthOf('1500', limits)).toBe(1500);
    });

    it('saves no width for a blank value', () => {
        expect(typedWidthOf('', limits)).toBeUndefined();
        expect(typedWidthOf('   ', limits)).toBeUndefined();
    });
});
