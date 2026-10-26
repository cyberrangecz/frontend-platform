import { EditorView } from '@codemirror/view';

/** Line height of the log text, relative to its font size. */
export const LOG_LINE_HEIGHT = '1.6';

export const crczpCodeEditorTheme = EditorView.theme(
    {
        '&': {
            backgroundColor: 'var(--log-background)',
            color: 'var(--log-foreground)',
            fontSize: 'var(--log-font-size, 14px)',
            fontFamily: 'var(--log-font-family, "Roboto Mono", "Courier New", monospace)',
        },
        '.cm-content': {
            caretColor: 'var(--log-cursor)',
            padding: '8px 0',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--log-cursor)',
            borderLeftWidth: '2px',
        },
        '&.cm-focused .cm-cursor': {
            borderLeftColor: 'var(--log-cursor)',
        },
        '.cm-activeLine': {
            backgroundColor: 'var(--log-active-line-background)',
        },
        '.cm-selectionBackground': {
            backgroundColor: 'var(--log-selection-background)',
        },
        '&.cm-focused .cm-selectionBackground': {
            backgroundColor: 'var(--log-selection-background)',
        },
        '::selection': {
            color: 'var(--log-selection-foreground, currentColor)',
            backgroundColor: 'var(--log-selection-background)',
        },
        '&.cm-focused ::selection': {
            color: 'var(--log-selection-foreground, currentColor)',
            backgroundColor: 'var(--log-selection-background)',
        },
        '.cm-gutters': {
            backgroundColor: 'var(--log-gutter-background)',
            color: 'var(--log-gutter-foreground)',
            border: 'none',
            borderRight:
                '1px solid color-mix(in srgb, var(--log-gutter-foreground) 30%, transparent)',
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'var(--log-active-line-background)',
            color: 'var(--log-foreground)',
        },
        '.cm-lineNumbers .cm-gutterElement': {
            padding: '0 8px 0 16px',
            minWidth: '40px',
        },
        '.cm-scroller': {
            fontFamily: 'var(--log-font-family, "Roboto Mono", "Courier New", monospace)',
            lineHeight: LOG_LINE_HEIGHT,
        },
        '.cm-line': {
            padding: '0 16px',
        },
        '.cm-panels': {
            fontFamily: 'inherit',
            backgroundColor: 'color-mix(in srgb, var(--log-foreground) 8%, var(--log-background))',
            color: 'var(--log-foreground)',
            border: 'none',
            borderBottom: '1px solid color-mix(in srgb, var(--log-foreground) 20%, var(--log-background))',
        },
        '.cm-panel.cm-search': {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-xs) var(--space-md)',
            padding: 'var(--space-md) var(--space-xl)',
            fontSize: 'var(--font-size-lg)',
        },
        '.cm-panel.cm-search br': {
            display: 'none',
        },
        '.cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label': {
            margin: '0',
            fontFamily: 'inherit',
            fontSize: 'var(--font-size-lg)',
        },
        '.cm-textfield': {
            boxSizing: 'border-box',
            minWidth: '12rem',
            backgroundColor: 'transparent',
            color: 'var(--log-foreground)',
            border: '1px solid color-mix(in srgb, var(--log-foreground) 50%, var(--log-background))',
            borderRadius: 'var(--space-3xs)',
            padding: 'var(--space-xs) var(--space-md)',
            outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        },
        '.cm-textfield:hover': {
            borderColor: 'var(--log-foreground)',
        },
        '.cm-textfield:focus': {
            borderColor: 'var(--log-ansi-4)',
            boxShadow: 'inset 0 0 0 1px var(--log-ansi-4)',
        },
        '.cm-textfield::placeholder': {
            color: 'color-mix(in srgb, var(--log-foreground) 70%, var(--log-background))',
        },
        '.cm-button': {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
            color: 'var(--log-ansi-4)',
            border: '1px solid color-mix(in srgb, var(--log-foreground) 30%, var(--log-background))',
            borderRadius: '1rem',
            padding: 'var(--space-2xs) var(--space-xl)',
            fontWeight: 'var(--font-weight-medium)',
            textTransform: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
        },
        '.cm-button:hover': {
            backgroundColor: 'color-mix(in srgb, var(--log-ansi-4) 14%, transparent)',
            backgroundImage: 'none',
        },
        '.cm-button:active': {
            backgroundColor: 'color-mix(in srgb, var(--log-ansi-4) 22%, transparent)',
            backgroundImage: 'none',
        },
        '.cm-button:focus-visible, .cm-panel.cm-search [name="close"]:focus-visible': {
            outline: '2px solid var(--log-ansi-4)',
            outlineOffset: '2px',
        },
        '.cm-panel.cm-search [name="close"]': {
            position: 'static',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2rem',
            height: '2rem',
            marginLeft: 'auto',
            padding: '0',
            backgroundColor: 'transparent',
            backgroundImage: 'none',
            color: 'var(--log-foreground)',
            border: 'none',
            borderRadius: '50%',
            fontSize: 'var(--font-size-5xl)',
            lineHeight: '1',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
        },
        '.cm-panel.cm-search [name="close"]:hover': {
            backgroundColor: 'color-mix(in srgb, var(--log-foreground) 16%, var(--log-background))',
        },
        '.cm-panel.cm-search [name="close"]:active': {
            backgroundColor: 'color-mix(in srgb, var(--log-foreground) 26%, var(--log-background))',
        },
        '.cm-panel.cm-search label': {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            color: 'var(--log-foreground)',
            cursor: 'pointer',
            userSelect: 'none',
        },
        '.cm-panel.cm-search input[type="checkbox"]': {
            width: 'var(--font-size-xl)',
            height: 'var(--font-size-xl)',
            cursor: 'pointer',
            accentColor: 'var(--log-ansi-4)',
        },
        '.cm-panel.cm-search input[type="checkbox"]:focus-visible': {
            outline: '2px solid var(--log-ansi-4)',
            outlineOffset: '2px',
        },
        // Search match highlighting
        '.cm-searchMatch': {
            backgroundColor: 'color-mix(in srgb, var(--log-ansi-3) 35%, var(--log-background))',
            outline: '1px solid color-mix(in srgb, var(--log-ansi-3) 60%, var(--log-background))',
        },
        '.cm-searchMatch-selected': {
            backgroundColor: 'color-mix(in srgb, var(--log-ansi-3) 55%, var(--log-background))',
            outline: '2px solid var(--log-ansi-3)',
        },
        // Scrollbar styling
        '.cm-scroller::-webkit-scrollbar': {
            width: '12px',
            height: '12px',
        },
        '.cm-scroller::-webkit-scrollbar-track': {
            backgroundColor: 'color-mix(in srgb, var(--log-foreground) 6%, var(--log-background))',
        },
        '.cm-scroller::-webkit-scrollbar-thumb': {
            backgroundColor: 'color-mix(in srgb, var(--log-foreground) 55%, var(--log-background))',
            borderRadius: '6px',
            border: '2px solid color-mix(in srgb, var(--log-foreground) 6%, var(--log-background))',
        },
        '.cm-scroller::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'color-mix(in srgb, var(--log-foreground) 70%, var(--log-background))',
        },
        '.cm-scroller::-webkit-scrollbar-corner': {
            backgroundColor: 'color-mix(in srgb, var(--log-foreground) 6%, var(--log-background))',
        },
    },
    { dark: false },
);
