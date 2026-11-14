import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

const MONOSPACE = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

/** Colours and type of the markdown source editor, from the page theme. */
const markdownEditorTheme = EditorView.theme({
    '&': {
        color: 'var(--mat-sys-on-surface)',
        backgroundColor: 'transparent',
        fontSize: 'var(--font-size-lg)',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: MONOSPACE, lineHeight: '1.7' },
    '.cm-content': { caretColor: 'var(--mat-sys-primary)' },
    '.cm-cursor, .cm-dropCursor': { borderLeft: '2px solid var(--mat-sys-primary)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'color-mix(in srgb, var(--mat-sys-primary) 22%, transparent) !important',
    },
    '.cm-gutters': {
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--mat-sys-outline)',
        fontVariantNumeric: 'tabular-nums',
    },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--mat-sys-on-surface) 4%, transparent)' },
    '.cm-activeLineGutter': { color: 'var(--mat-sys-on-surface-variant)' },
    '.cm-placeholder': { color: 'var(--mat-sys-on-surface-variant)' },
});

/** Markdown token colours, from the page theme. */
const markdownHighlighting = syntaxHighlighting(
    HighlightStyle.define([
        { tag: tags.heading, color: 'var(--mat-sys-primary)', fontWeight: '600' },
        { tag: tags.strong, fontWeight: '600' },
        { tag: tags.emphasis, fontStyle: 'italic' },
        { tag: tags.strikethrough, textDecoration: 'line-through' },
        { tag: tags.link, color: 'var(--mat-sys-primary)', textDecoration: 'underline' },
        { tag: tags.url, color: 'var(--mat-sys-on-surface-variant)' },
        { tag: tags.monospace, color: 'var(--mat-sys-tertiary)' },
        { tag: tags.quote, color: 'var(--mat-sys-on-surface-variant)', fontStyle: 'italic' },
        { tag: [tags.processingInstruction, tags.contentSeparator], color: 'var(--mat-sys-outline)' },
    ]),
);

/** Markdown language with wrapped lines, the page theme and syntax colours. */
export const markdownEditorExtensions: Extension = [
    EditorView.lineWrapping,
    markdown({ codeLanguages: languages }),
    markdownEditorTheme,
    markdownHighlighting,
];
