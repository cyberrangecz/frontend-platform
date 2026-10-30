/**
 * The 16 colours of a terminal palette: black, red, green, yellow, blue, magenta, cyan and white,
 * followed by their 8 bright variants in the same order.
 */
export type AnsiColors = readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
];

/**
 * Every colour the log view draws with. Any CSS colour value is accepted.
 */
export interface LogPalette {
    readonly background: string;
    readonly foreground: string;
    readonly cursor: string;
    readonly selectionBackground: string;
    /** Text colour inside a selection; the text keeps its own colour when absent. */
    readonly selectionForeground?: string;
    /** Derived from background and foreground when absent. */
    readonly gutterBackground?: string;
    /** Derived from background and foreground when absent. */
    readonly gutterForeground?: string;
    /** Derived from foreground when absent. */
    readonly activeLineBackground?: string;
    readonly ansi: AnsiColors;
}

/**
 * Name of the custom property holding one ANSI colour.
 */
export const ansiVariableName = (slot: number): string => `--log-ansi-${slot}`;

/**
 * Custom properties the editor theme reads.
 */
export const LOG_VARIABLES = {
    background: '--log-background',
    foreground: '--log-foreground',
    cursor: '--log-cursor',
    selectionBackground: '--log-selection-background',
    selectionForeground: '--log-selection-foreground',
    gutterBackground: '--log-gutter-background',
    gutterForeground: '--log-gutter-foreground',
    activeLineBackground: '--log-active-line-background',
} as const;

const DERIVED_VALUES = {
    gutterBackground: `color-mix(in srgb, var(${LOG_VARIABLES.background}) 96%, var(${LOG_VARIABLES.foreground}))`,
    gutterForeground: `color-mix(in srgb, var(${LOG_VARIABLES.foreground}) 55%, var(${LOG_VARIABLES.background}))`,
    activeLineBackground: `color-mix(in srgb, var(${LOG_VARIABLES.foreground}) 6%, transparent)`,
} as const;

/**
 * Sets the palette's colours as custom properties on an element; the editor inside it restyles
 * without its text being tokenized again.
 */
export function applyLogPalette(
    element: HTMLElement,
    palette: LogPalette,
): void {
    const { style } = element;
    palette.ansi.forEach((color, slot) =>
        style.setProperty(ansiVariableName(slot), color),
    );
    style.setProperty(LOG_VARIABLES.background, palette.background);
    style.setProperty(LOG_VARIABLES.foreground, palette.foreground);
    style.setProperty(LOG_VARIABLES.cursor, palette.cursor);
    style.setProperty(
        LOG_VARIABLES.selectionBackground,
        palette.selectionBackground,
    );
    style.setProperty(
        LOG_VARIABLES.gutterBackground,
        palette.gutterBackground ?? DERIVED_VALUES.gutterBackground,
    );
    style.setProperty(
        LOG_VARIABLES.gutterForeground,
        palette.gutterForeground ?? DERIVED_VALUES.gutterForeground,
    );
    style.setProperty(
        LOG_VARIABLES.activeLineBackground,
        palette.activeLineBackground ?? DERIVED_VALUES.activeLineBackground,
    );
    if (palette.selectionForeground === undefined) {
        style.removeProperty(LOG_VARIABLES.selectionForeground);
    } else {
        style.setProperty(
            LOG_VARIABLES.selectionForeground,
            palette.selectionForeground,
        );
    }
}

/**
 * Platform light palette: unimportant text (bright black) stays pale, every other token colour
 * keeps a contrast of 5 to 7 against the background so none outweighs the rest.
 */
export const PLATFORM_LIGHT: LogPalette = {
    background: '#fdfbff',
    foreground: '#1a1b20',
    cursor: '#4b7eff',
    selectionBackground: '#d9e2ff',
    ansi: [
        '#1a1b20',
        '#cb130b',
        '#067913',
        '#8d6007',
        '#1e4ff3',
        '#a617d3',
        '#07737e',
        '#c4c6d0',
        '#708090',
        '#ce2205',
        '#067742',
        '#7c6507',
        '#3e5bef',
        '#9932cc',
        '#1e90ff',
        '#ffffff',
    ],
};

/**
 * Platform dark palette: the platform hues lightened for a dark background, unimportant text
 * (bright black) kept pale, every other token colour balanced at a contrast of 6 to 10.
 */
export const PLATFORM_DARK: LogPalette = {
    background: '#17181d',
    foreground: '#e3e2e9',
    cursor: '#9db4ff',
    selectionBackground: '#2f3f6f',
    ansi: [
        '#17181d',
        '#f0706a',
        '#6fd27a',
        '#dfaa3a',
        '#7aa2ff',
        '#d08ae8',
        '#4fc3cf',
        '#c4c6d0',
        '#6f7791',
        '#ff8a80',
        '#4fcf93',
        '#d8c05a',
        '#98aeff',
        '#d9a6f2',
        '#6fb6ff',
        '#ffffff',
    ],
};
