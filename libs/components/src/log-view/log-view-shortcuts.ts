export type LogViewAction =
    | 'fullscreen'
    | 'lineWrap'
    | 'copy'
    | 'download'
    | 'search'
    | 'scrollToTop'
    | 'scrollToEnd'
    | 'prettifyJson'
    | 'settings';

interface KeyboardShortcut {
    /** Physical key, as `KeyboardEvent.code` names it. */
    readonly code: string;
    /** Name of the key shown to the person. */
    readonly keyName: string;
    readonly control?: boolean;
    readonly meta?: boolean;
    readonly alt?: boolean;
    readonly shift?: boolean;
}

type LogViewShortcutTable = Record<LogViewAction, KeyboardShortcut>;

const altShift = (letter: string): KeyboardShortcut => ({
    code: `Key${letter}`,
    keyName: letter,
    alt: true,
    shift: true,
});

const DEFAULT_SHORTCUTS: LogViewShortcutTable = {
    fullscreen: altShift('F'),
    lineWrap: altShift('W'),
    copy: altShift('C'),
    download: altShift('D'),
    search: { code: 'KeyF', keyName: 'F', control: true },
    scrollToTop: { code: 'Home', keyName: 'Home', control: true },
    scrollToEnd: { code: 'End', keyName: 'End', control: true },
    prettifyJson: altShift('P'),
    settings: altShift('S'),
};

const MAC_SHORTCUTS: LogViewShortcutTable = {
    ...DEFAULT_SHORTCUTS,
    search: { code: 'KeyF', keyName: 'F', meta: true },
    scrollToTop: { code: 'ArrowUp', keyName: '↑', meta: true },
    scrollToEnd: { code: 'ArrowDown', keyName: '↓', meta: true },
};

const LOG_VIEW_ACTIONS = Object.keys(DEFAULT_SHORTCUTS) as LogViewAction[];

const shortcutsFor = (isMac: boolean): LogViewShortcutTable => (isMac ? MAC_SHORTCUTS : DEFAULT_SHORTCUTS);

/**
 * Finds the log view action whose shortcut the key press matches on the given platform. Keys are
 * matched by their physical position, so a modifier that changes the typed character, such as
 * Option on macOS, still matches; every modifier must be exactly as the shortcut defines it.
 */
export function matchLogViewShortcut(event: KeyboardEvent, isMac: boolean): LogViewAction | undefined {
    const shortcuts = shortcutsFor(isMac);
    return LOG_VIEW_ACTIONS.find((action) => {
        const shortcut = shortcuts[action];
        return (
            event.code === shortcut.code &&
            event.ctrlKey === (shortcut.control ?? false) &&
            event.metaKey === (shortcut.meta ?? false) &&
            event.altKey === (shortcut.alt ?? false) &&
            event.shiftKey === (shortcut.shift ?? false)
        );
    });
}

/**
 * Writes every log view shortcut of the platform the way it shows key combinations: modifier
 * symbols followed by the key on macOS (`⌥⇧W`, `⌘F`), modifier names joined by plus signs
 * elsewhere (`Alt+Shift+W`).
 */
export function describeLogViewShortcuts(isMac: boolean): Record<LogViewAction, string> {
    const shortcuts = shortcutsFor(isMac);
    const describe = ({ keyName, control, meta, alt, shift }: KeyboardShortcut) => {
        const modifiers = [
            control && (isMac ? '⌃' : 'Ctrl'),
            meta && '⌘',
            alt && (isMac ? '⌥' : 'Alt'),
            shift && (isMac ? '⇧' : 'Shift'),
        ].filter((modifier) => typeof modifier === 'string');
        return isMac ? [...modifiers, keyName].join('') : [...modifiers, keyName].join('+');
    };
    return Object.fromEntries(LOG_VIEW_ACTIONS.map((action) => [action, describe(shortcuts[action])])) as Record<
        LogViewAction,
        string
    >;
}

/** Tells whether the user agent string names an Apple platform, whose keyboards label Alt as Option. */
export function isMacPlatform(userAgent: string): boolean {
    return /Mac|iPhone|iPad|iPod/.test(userAgent);
}
