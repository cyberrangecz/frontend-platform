import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import {
    COMMON_MONOSPACE_FAMILIES,
    DEFAULT_LOG_VIEW_FONT_FAMILY,
    discoverMonospaceFonts,
} from './monospace-fonts';

const MONOSPACE_WIDTH = 10;
const SERIF_WIDTH = 7;
const INSTALLED_FAMILY_WIDTH = 9;

/** Stubs canvas text measurement from a table of font stacks to the width of one character. */
function stubCanvas(
    characterWidths: (fontStack: string, text: string) => number,
): void {
    const context = {
        font: '',
        measureText(text: string) {
            const fontStack = context.font.replace(/^\S+\s/, '');
            return { width: characterWidths(fontStack, text) * text.length };
        },
    };
    vi.spyOn(document, 'createElement').mockReturnValue({
        getContext: () => context,
    } as unknown as HTMLCanvasElement);
}

function stubLocalFonts(
    query: () => Promise<{ family: string }[]> | undefined,
): void {
    Object.defineProperty(window, 'queryLocalFonts', {
        configurable: true,
        value: query,
    });
}

describe('discoverMonospaceFonts', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        Reflect.deleteProperty(window, 'queryLocalFonts');
    });

    it('keeps only local families whose i and W measure alike', async () => {
        stubCanvas((fontStack, text) => {
            if (fontStack.startsWith('"Fira Code"')) return 8;
            return text === 'i' ? 3 : SERIF_WIDTH;
        });
        stubLocalFonts(() =>
            Promise.resolve([{ family: 'Fira Code' }, { family: 'Arial' }]),
        );

        const families = await firstValueFrom(discoverMonospaceFonts());

        expect(families).toEqual(['Fira Code', DEFAULT_LOG_VIEW_FONT_FAMILY]);
    });

    it('deduplicates local faces of one family and sorts the result', async () => {
        stubCanvas(() => 8);
        stubLocalFonts(() =>
            Promise.resolve([
                { family: 'Hack' },
                { family: 'Hack' },
                { family: 'Consolas' },
            ]),
        );

        const families = await firstValueFrom(discoverMonospaceFonts());

        expect(families).toEqual([
            'Consolas',
            'Hack',
            DEFAULT_LOG_VIEW_FONT_FAMILY,
        ]);
    });

    it('probes the built-in list when the Local Font Access API is absent', async () => {
        stubCanvas((fontStack) => {
            if (
                fontStack.startsWith('"Menlo"') ||
                fontStack.startsWith('"Hack"')
            ) {
                return INSTALLED_FAMILY_WIDTH;
            }
            return fontStack.endsWith('serif') ? SERIF_WIDTH : MONOSPACE_WIDTH;
        });

        const families = await firstValueFrom(discoverMonospaceFonts());

        expect(families).toEqual([
            'Hack',
            'Menlo',
            DEFAULT_LOG_VIEW_FONT_FAMILY,
        ]);
    });

    it('probes the built-in list when the permission prompt is declined', async () => {
        stubCanvas((fontStack) =>
            fontStack.startsWith('"Consolas"')
                ? INSTALLED_FAMILY_WIDTH
                : fontStack.endsWith('serif')
                  ? SERIF_WIDTH
                  : MONOSPACE_WIDTH,
        );
        stubLocalFonts(() =>
            Promise.reject(new DOMException('denied', 'NotAllowedError')),
        );

        const families = await firstValueFrom(discoverMonospaceFonts());

        expect(families).toEqual(['Consolas', DEFAULT_LOG_VIEW_FONT_FAMILY]);
    });

    it('lists only the default font when no probed family is installed', async () => {
        stubCanvas((fontStack) =>
            fontStack.endsWith('serif') ? SERIF_WIDTH : MONOSPACE_WIDTH,
        );

        const families = await firstValueFrom(discoverMonospaceFonts());

        expect(families).toEqual([DEFAULT_LOG_VIEW_FONT_FAMILY]);
    });

    it('lists the probed families while the local font query stays unanswered, then the local ones', async () => {
        vi.useFakeTimers();
        try {
            stubCanvas((fontStack, text) => {
                if (fontStack.startsWith('"Menlo"')) return INSTALLED_FAMILY_WIDTH;
                if (fontStack.startsWith('"Hack"') && text.length === 1) return 8;
                return fontStack.endsWith('serif') ? SERIF_WIDTH : MONOSPACE_WIDTH;
            });
            let answer: (fonts: { family: string }[]) => void = () => undefined;
            stubLocalFonts(() => new Promise((resolve) => (answer = resolve)));
            const emitted: string[][] = [];

            discoverMonospaceFonts().subscribe((families) => emitted.push(families));
            await vi.advanceTimersByTimeAsync(2000);
            answer([{ family: 'Hack' }]);
            await vi.advanceTimersByTimeAsync(0);

            expect(emitted).toEqual([
                ['Menlo', DEFAULT_LOG_VIEW_FONT_FAMILY],
                ['Hack', DEFAULT_LOG_VIEW_FONT_FAMILY],
            ]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('lists only the local families when the query answers in time', async () => {
        vi.useFakeTimers();
        try {
            stubCanvas(() => 8);
            stubLocalFonts(() => Promise.resolve([{ family: 'Hack' }]));
            const emitted: string[][] = [];

            discoverMonospaceFonts().subscribe((families) => emitted.push(families));
            await vi.advanceTimersByTimeAsync(5000);

            expect(emitted).toEqual([['Hack', DEFAULT_LOG_VIEW_FONT_FAMILY]]);
        } finally {
            vi.useRealTimers();
        }
    });

    it('does not query local fonts before the stream is subscribed to', () => {
        const query = vi.fn(() => Promise.resolve([]));
        stubLocalFonts(query);

        discoverMonospaceFonts();

        expect(query).not.toHaveBeenCalled();
    });

    it('ships about 25 probe names including the default font', () => {
        expect(COMMON_MONOSPACE_FAMILIES).toContain(
            DEFAULT_LOG_VIEW_FONT_FAMILY,
        );
        expect(COMMON_MONOSPACE_FAMILIES.length).toBeGreaterThanOrEqual(25);
    });
});
