import { describe, expect, it } from 'vitest';
import { LOG_TOKEN_SLOTS } from './log-token-slots';
import { PALE_SLOT } from './log-highlight-level';
import { LogPalette } from './log-palette';
import { LOG_PRESETS } from './log-presets';
import { HIGH_CONTRAST_DARK } from './log-high-contrast-presets';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const BRIGHT_BLACK_SLOT = 8;

function relativeLuminance(hex: string): number {
    const [red, green, blue] = [1, 3, 5]
        .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
        .map((channel) =>
            channel <= 0.03928
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4,
        );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
    const [lighter, darker] = [
        relativeLuminance(first),
        relativeLuminance(second),
    ].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

function editorColors(palette: LogPalette): string[] {
    return [
        palette.background,
        palette.foreground,
        palette.cursor,
        palette.selectionBackground,
    ];
}

describe('log presets', () => {
    it('lists 3 platform, 10 dark and 10 light other presets in that order', () => {
        const groups = LOG_PRESETS.map(({ group, scheme }) =>
            group === 'other' ? `${group}-${scheme}` : group,
        );
        expect(groups).toEqual([
            'platform',
            'platform',
            'platform',
            ...Array(10).fill('other-dark'),
            ...Array(10).fill('other-light'),
        ]);
    });

    it('has unique ids', () => {
        const ids = LOG_PRESETS.map(({ id }) => id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(LOG_PRESETS.map((preset) => [preset.id, preset] as const))(
        '%s has 16 ANSI colours and all editor colours',
        (_id, { palette }) => {
            expect(palette.ansi).toHaveLength(16);
            [...palette.ansi, ...editorColors(palette)].forEach((color) =>
                expect(color).toMatch(HEX_COLOR),
            );
            if (palette.selectionForeground !== undefined) {
                expect(palette.selectionForeground).toMatch(HEX_COLOR);
            }
        },
    );

    describe('pale text', () => {
        it.each(
            LOG_PRESETS.map((preset) => [preset.id, preset.palette] as const),
        )(
            '%s keeps pale text at 3:1 against the background and paler than the plain text',
            (_id, palette) => {
                const pale = contrastRatio(
                    palette.ansi[PALE_SLOT],
                    palette.background,
                );
                expect(pale).toBeGreaterThanOrEqual(3);
                expect(pale).toBeLessThan(
                    contrastRatio(palette.foreground, palette.background),
                );
            },
        );
    });

    describe('high contrast dark preset', () => {
        const tokenSlots = new Set<number>(Object.values(LOG_TOKEN_SLOTS));
        tokenSlots.delete(BRIGHT_BLACK_SLOT);

        it('meets 7:1 for text and token colours and 4.5:1 for the rest', () => {
            const { palette } = HIGH_CONTRAST_DARK;
            const ratio = (color: string) => contrastRatio(color, palette.background);
            expect(ratio(palette.foreground)).toBeGreaterThanOrEqual(7);
            tokenSlots.forEach((slot) =>
                expect(ratio(palette.ansi[slot])).toBeGreaterThanOrEqual(7),
            );
            palette.ansi.forEach((color) =>
                expect(ratio(color)).toBeGreaterThanOrEqual(4.5),
            );
        });
    });

    describe('platform presets', () => {
        const paleSlots = new Set<number>([BRIGHT_BLACK_SLOT]);
        const tokenSlots = [...new Set<number>(Object.values(LOG_TOKEN_SLOTS))];

        it.each(
            LOG_PRESETS.filter(({ group }) => group === 'platform').map(
                (preset) => [preset.id, preset.palette] as const,
            ),
        )(
            '%s keeps pale slots at 3:1 and every other token colour at 4.5:1',
            (_id, palette) => {
                const ratio = (color: string) =>
                    contrastRatio(color, palette.background);
                tokenSlots.forEach((slot) =>
                    expect(
                        ratio(palette.ansi[slot] as string),
                    ).toBeGreaterThanOrEqual(paleSlots.has(slot) ? 3 : 4.5),
                );
            },
        );
    });
});
