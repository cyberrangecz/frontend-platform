import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Extension } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { tags } from '@lezer/highlight';

const MONOSPACE = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

/** A palette tone for light surfaces, paired with its mirror tone for dark ones. */
function shade(palette: string, tone: number): string {
    return `light-dark(var(--${palette}-${tone}), var(--${palette}-${100 - tone}))`;
}

/** Type, gutter and selection of a read-only file preview, from the page theme. */
const textPreviewTheme = EditorView.theme({
    '&': {
        color: 'var(--mat-sys-on-surface)',
        backgroundColor: 'transparent',
        fontSize: 'var(--font-size-md)',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: MONOSPACE, lineHeight: '1.6' },
    '.cm-content': { padding: 'var(--space-sm) 0', caretColor: 'transparent' },
    '.cm-line': { padding: '0 var(--space-xl) 0 var(--space-md)' },
    '.cm-gutters': {
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--mat-sys-outline)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        minWidth: 'calc(3 * var(--space-md))',
        padding: '0 var(--space-2xs) 0 var(--space-md)',
        fontVariantNumeric: 'tabular-nums',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--mat-sys-primary-container) !important',
    },
});

/** Token colours of scripts and configuration files, kept within the page's calm blue range. */
const textPreviewHighlighting = syntaxHighlighting(
    HighlightStyle.define([
        { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword], color: shade('primary', 40), fontWeight: '500' },
        { tag: [tags.string, tags.special(tags.string), tags.regexp], color: shade('warning', 30) },
        { tag: [tags.comment, tags.lineComment, tags.blockComment], color: shade('neutral-variant', 50), fontStyle: 'italic' },
        { tag: [tags.number, tags.bool, tags.atom, tags.null], color: shade('tertiary', 50) },
        { tag: [tags.propertyName, tags.attributeName, tags.definition(tags.propertyName)], color: shade('secondary', 40) },
        { tag: [tags.variableName, tags.special(tags.variableName)], color: shade('primary', 30) },
        { tag: [tags.function(tags.variableName), tags.typeName], color: shade('secondary', 30) },
        { tag: [tags.meta, tags.processingInstruction, tags.punctuation, tags.operator], color: shade('neutral-variant', 40) },
        { tag: tags.heading, color: shade('primary', 30), fontWeight: '600' },
    ]),
);

/** Read-only presentation of a text file: line numbers, theme and token colours, no line wrapping. */
export const textPreviewExtensions: Extension = [
    lineNumbers(),
    EditorView.editable.of(false),
    textPreviewTheme,
    textPreviewHighlighting,
];
