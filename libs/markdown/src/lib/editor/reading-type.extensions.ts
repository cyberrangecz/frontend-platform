import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

const HEADING_LINE_PATTERN = /^(#{1,6})\s/;
/** Font size of each heading level, matching the rendered level content; deeper levels share the last. */
const HEADING_FONT_SIZES = ['var(--font-size-3xl)', 'var(--font-size-2xl)', 'var(--font-size-xl)', 'var(--font-size-lg)'];

const headingLineDecorations = HEADING_FONT_SIZES.map((_, index) => Decoration.line({ class: `cm-reading-heading cm-reading-heading--${index + 1}` }));

/** Heading lines in the font size, weight and line height the level content renders them in. */
const readingTypeTheme = EditorView.theme({
    '&.cm-editor': { fontSize: 'inherit' },
    '&.cm-editor .cm-scroller': { fontFamily: 'inherit', lineHeight: 'inherit' },
    '.cm-reading-heading': { fontWeight: 'var(--font-weight-semibold)', lineHeight: '1.3', letterSpacing: '-0.005em' },
    ...Object.fromEntries(HEADING_FONT_SIZES.map((size, index) => [`.cm-reading-heading--${index + 1}`, { fontSize: size }])),
});

function headingLinesOf(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to } of view.visibleRanges) {
        for (let position = from; position <= to; ) {
            const line = view.state.doc.lineAt(position);
            const level = HEADING_LINE_PATTERN.exec(line.text)?.[1]?.length;
            const decoration = level ? headingLineDecorations[Math.min(level, headingLineDecorations.length) - 1] : undefined;
            if (decoration) {
                builder.add(line.from, line.from, decoration);
            }
            position = line.to + 1;
        }
    }
    return builder.finish();
}

const headingLines = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = headingLinesOf(view);
        }

        update(update: ViewUpdate): void {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = headingLinesOf(update.view);
            }
        }
    },
    { decorations: (instance) => instance.decorations },
);

/**
 * Sets markdown source in the type of the surrounding rendered content: its font family, size and
 * line height, with heading lines at the size of the heading they render as.
 */
export const readingTypeExtensions: Extension = [readingTypeTheme, headingLines];
