/**
 * Theme colors resolved from CSS custom properties for use in ECharts canvas
 * rendering. ECharts draws onto a canvas element and cannot resolve
 * `var(--token)` expressions at paint time, so concrete color strings must be
 * supplied up-front.
 */
export interface ChartPalette {
    /** Primary brand/accent color (maps to `--primary-40`). */
    readonly accent: string;
    /** Secondary text and label color (maps to `--neutral-50`). */
    readonly mutedText: string;
    /** Grid-line and axis-line color (maps to `--neutral-90`). */
    readonly gridLine: string;
    /** Canvas/tooltip background color (maps to `--background`). */
    readonly surface: string;
    /** Scrollbar track color, matching the theme's webkit scrollbar (maps to `--primary-80`). */
    readonly scrollTrack: string;
    /** Scrollbar thumb color, matching the theme's webkit scrollbar (maps to `--primary-10`). */
    readonly scrollThumb: string;
    /** Primary text color for axis labels and the current-time marker (maps to `--neutral-10`). */
    readonly text: string;
}

/**
 * Resolves all palette fields from the document root's `@crczp/theme` CSS custom
 * properties. Reads `:root` (`document.documentElement`), which always carries the
 * theme tokens and is always attached, so resolution is independent of any chart's
 * mount state or lifecycle timing.
 *
 * @returns The resolved palette with concrete color strings.
 */
export function resolveChartPalette(): ChartPalette {
    const styles = getComputedStyle(document.documentElement);
    const read = (token: string): string => styles.getPropertyValue(token).trim();
    return {
        accent: read('--primary-40'),
        mutedText: read('--neutral-50'),
        gridLine: read('--neutral-90'),
        surface: read('--background'),
        scrollTrack: read('--primary-80'),
        scrollThumb: read('--primary-10'),
        text: read('--neutral-10'),
    };
}
