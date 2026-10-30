import { catchError, defer, from, map, merge, Observable, of, share, takeUntil, timer } from 'rxjs';

export const DEFAULT_LOG_VIEW_FONT_FAMILY = 'Roboto Mono';

export const COMMON_MONOSPACE_FAMILIES: readonly string[] = [
    'Roboto Mono',
    'JetBrains Mono',
    'Fira Code',
    'Fira Mono',
    'Cascadia Code',
    'Cascadia Mono',
    'Consolas',
    'Menlo',
    'Monaco',
    'SF Mono',
    'DejaVu Sans Mono',
    'Liberation Mono',
    'Ubuntu Mono',
    'Source Code Pro',
    'Hack',
    'IBM Plex Mono',
    'Noto Sans Mono',
    'Courier New',
    'Lucida Console',
    'Andale Mono',
    'Inconsolata',
    'Droid Sans Mono',
    'Anonymous Pro',
    'Space Mono',
    'Victor Mono',
    'Iosevka',
];

const PROBE_FONT_SIZE = '72px';
const PROBE_TEXT = 'mmmmmmmmmmlli1WwMO0';
const LOCAL_FONT_QUERY_PATIENCE = 2000; // ms

interface LocalFontFace {
    readonly family: string;
}

type LocalFontQuery = () => Promise<readonly LocalFontFace[]>;

/**
 * Resolves the monospace font families available to the log view.
 * Chromium browsers list installed fonts through the Local Font Access API,
 * which asks the person for permission when the returned stream is subscribed to.
 * Other browsers, a declined prompt or a failing query fall back to probing a
 * built-in list of common monospace families. A query still unanswered after a
 * short wait emits the probed families first and the installed ones once it answers.
 * Each list is sorted, free of duplicates and always contains the default font.
 */
export function discoverMonospaceFonts(): Observable<string[]> {
    return defer(() => {
        const queryLocalFonts = (
            window as { queryLocalFonts?: LocalFontQuery }
        ).queryLocalFonts?.bind(window);
        if (!queryLocalFonts) {
            return of(probeInstalledFamilies());
        }
        const localFamilies = from<Promise<readonly LocalFontFace[]>>(queryLocalFonts()).pipe(
            map((fonts) =>
                fonts.map((font) => font.family).filter(isMonospace),
            ),
            catchError(() => of(probeInstalledFamilies())),
            share(),
        );
        const probedWhileWaiting = timer(LOCAL_FONT_QUERY_PATIENCE).pipe(
            map(() => probeInstalledFamilies()),
            takeUntil(localFamilies),
        );
        return merge(probedWhileWaiting, localFamilies);
    }).pipe(map(withDefaultFamily));
}

function withDefaultFamily(families: readonly string[]): string[] {
    return [...new Set([...families, DEFAULT_LOG_VIEW_FONT_FAMILY])].sort(
        (first, second) => first.localeCompare(second),
    );
}

function probeInstalledFamilies(): string[] {
    const measure = createMeasurer();
    const monospaceWidth = measure('monospace', PROBE_TEXT);
    const serifWidth = measure('serif', PROBE_TEXT);
    return COMMON_MONOSPACE_FAMILIES.filter(
        (family) =>
            measure(`"${family}", monospace`, PROBE_TEXT) !== monospaceWidth ||
            measure(`"${family}", serif`, PROBE_TEXT) !== serifWidth,
    );
}

/** A family is monospace when `i` and `W` measure alike; a missing font falls back to serif, where they differ. */
function isMonospace(family: string): boolean {
    const measure = createMeasurer();
    const fontStack = `"${family}", serif`;
    return measure(fontStack, 'i') === measure(fontStack, 'W');
}

function createMeasurer(): (fontStack: string, text: string) => number {
    const context = document.createElement('canvas').getContext('2d');
    return (fontStack, text) => {
        if (!context) {
            return 0;
        }
        context.font = `${PROBE_FONT_SIZE} ${fontStack}`;
        return context.measureText(text).width;
    };
}
