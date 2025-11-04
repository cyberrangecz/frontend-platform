import { EditorView } from '@codemirror/view';

export const crczpCodeEditorTheme = EditorView.theme(
    {
        '&': {
            backgroundColor: 'var(--neutral-99)',
            color: 'var(--neutral-10)',
            fontSize: '14px',
            fontFamily: '"Roboto Mono", "Courier New", monospace',
        },
        '.cm-content': {
            caretColor: 'var(--primary-40)',
            padding: '8px 0',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--primary-40)',
            borderLeftWidth: '2px',
        },
        '&.cm-focused .cm-cursor': {
            borderLeftColor: 'var(--primary-40)',
        },
        '&.cm-focused .cm-selectionBackground, ::selection': {
            backgroundColor: 'var(--primary-90)',
        },
        '.cm-selectionBackground': {
            backgroundColor: 'var(--primary-95)',
        },
        '.cm-activeLine': {
            backgroundColor: 'var(--neutral-95)',
        },
        '.cm-gutters': {
            backgroundColor: 'var(--neutral-98)',
            color: 'var(--neutral-50)',
            border: 'none',
            borderRight: '1px solid var(--neutral-90)',
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'var(--neutral-95)',
            color: 'var(--primary-40)',
        },
        '.cm-lineNumbers .cm-gutterElement': {
            padding: '0 8px 0 16px',
            minWidth: '40px',
        },
        '.cm-scroller': {
            fontFamily: '"Roboto Mono", "Courier New", monospace',
            lineHeight: '1.6',
        },
        '.cm-line': {
            padding: '0 16px',
        },
        // Search panel styling
        '.cm-panels': {
            backgroundColor: 'var(--neutral-98)',
            color: 'var(--neutral-10)',
            border: 'none',
            borderBottom: '1px solid var(--neutral-90)',
        },
        '.cm-panel.cm-search': {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: 'var(--neutral-98)',
        },
        // Search input
        '.cm-textfield': {
            backgroundColor: 'transparent',
            color: 'var(--neutral-10)',
            border: 'none',
            borderBottom: '1px solid var(--neutral-70)',
            borderRadius: '0',
            padding: '4px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-bottom-color 0.2s ease',
        },
        '.cm-textfield:focus': {
            borderBottom: '1px solid var(--primary-40)',
            outline: 'none',
            backgroundColor: 'rgba(75,126,255,0.1)',
        },
        '.cm-textfield::placeholder': {
            color: 'var(--neutral-60)',
        },
        // Buttons
        '.cm-button': {
            backgroundColor: 'var(--primary-40)',
            backgroundImage: 'none',
            color: 'white',
            border: 'none',
            borderRadius: '1rem',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
        },
        '.cm-button:hover': {
            backgroundColor: 'var(--primary-30)',
            backgroundImage: 'none',
        },
        '.cm-button:active': {
            backgroundColor: 'var(--primary-20)',
            backgroundImage: 'none',
        },
        // Close button styling
        '.cm-panel.cm-search [name="close"]': {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
            color: 'var(--neutral-30)',
            border: 'none',
            borderRadius: '50%',
            letterSpacing: '0',
            width: '32px',
            height: '32px',
            padding: '0',
            top: '12px',
            fontSize: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 'auto',
            transition: 'background-color 0.2s ease',
        },
        '.cm-panel.cm-search [name="close"]:hover': {
            backgroundColor: 'var(--neutral-90)',
            backgroundImage: 'none',
        },
        '.cm-panel.cm-search [name="close"]:active': {
            backgroundColor: 'var(--neutral-85)',
            backgroundImage: 'none',
        },
        // Checkbox labels
        '.cm-panel.cm-search label': {
            display: 'inline-flex',
            alignItems: 'flex-end',
            gap: '6px',
            color: 'var(--neutral-10)',
            fontSize: '12px',
            cursor: 'pointer',
            userSelect: 'none',
            margin: '0',
        },
        '.cm-panel.cm-search input[type="checkbox"]': {
            width: '16px',
            height: '16px',
            margin: '0',
            cursor: 'pointer',
            accentColor: 'var(--primary-40)',
        },
        // Hide line breaks in search panel
        '.cm-panel.cm-search br': {
            display: 'none',
        },
        // Search match highlighting
        '.cm-searchMatch': {
            backgroundColor: 'var(--warning-90)',
            outline: '1px solid var(--warning-70)',
        },
        '.cm-searchMatch-selected': {
            backgroundColor: 'var(--warning-80)',
            outline: '2px solid var(--warning-60)',
        },
        // Scrollbar styling
        '.cm-scroller::-webkit-scrollbar': {
            width: '12px',
            height: '12px',
        },
        '.cm-scroller::-webkit-scrollbar-track': {
            backgroundColor: 'var(--neutral-95)',
        },
        '.cm-scroller::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--primary-80)',
            borderRadius: '6px',
            border: '2px solid var(--neutral-95)',
        },
        '.cm-scroller::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'var(--primary-70)',
        },
        '.cm-scroller::-webkit-scrollbar-corner': {
            backgroundColor: 'var(--neutral-95)',
        },
    },
    { dark: false },
);
