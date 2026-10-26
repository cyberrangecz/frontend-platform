import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

const PERSON_INPUT_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
const SCROLL_TOLERANCE = 1; // px

interface LineAnchor {
    /** Document position where the line at the top edge of the scroller starts. */
    readonly position: number;
    /** Share of that line's height scrolled past the top edge, from 0 to 1. */
    readonly fraction: number;
}

/** Height, relative to the top of the document, of the scroller's top edge. */
const scrolledHeight = (view: EditorView): number =>
    view.scrollDOM.scrollTop * view.scaleY - view.documentPadding.top;

class ReadingPosition {
    private anchor: LineAnchor | undefined = undefined;
    private isHeld = false;

    private readonly recordAnchor = () => {
        if (!this.isHeld) {
            this.anchor = this.readTopLine();
        }
    };

    constructor(private readonly view: EditorView) {
        view.scrollDOM.addEventListener('scroll', this.recordAnchor);
        PERSON_INPUT_EVENTS.forEach((type) =>
            view.dom.addEventListener(type, this.release, { passive: true }),
        );
    }

    /** Keeps the line last scrolled to at the top until the person scrolls or types. */
    hold() {
        this.isHeld = this.anchor !== undefined;
    }

    readonly release = () => {
        this.isHeld = false;
    };

    /** Scrolls the held line back to the top edge when the scroller has drifted from it. */
    restore() {
        if (!this.isHeld || !this.anchor) return;
        const block = this.view.lineBlockAt(this.anchor.position);
        const scrollTop =
            (block.top + this.anchor.fraction * block.height + this.view.documentPadding.top) /
            this.view.scaleY;
        if (Math.abs(this.view.scrollDOM.scrollTop - scrollTop) > SCROLL_TOLERANCE) {
            this.view.scrollDOM.scrollTop = scrollTop;
        }
    }

    update(update: ViewUpdate) {
        if (this.anchor && update.docChanged && update.changes.touchesRange(0, this.anchor.position)) {
            this.anchor = undefined;
            this.isHeld = false;
        }
    }

    destroy() {
        this.view.scrollDOM.removeEventListener('scroll', this.recordAnchor);
        PERSON_INPUT_EVENTS.forEach((type) => this.view.dom.removeEventListener(type, this.release));
    }

    private readTopLine(): LineAnchor {
        const height = scrolledHeight(this.view);
        const block = this.view.lineBlockAtHeight(height);
        const fraction = block.height > 0 ? (height - block.top) / block.height : 0;
        return { position: block.from, fraction: Math.min(Math.max(fraction, 0), 1) };
    }
}

/**
 * Tracks the line at the top of the scroller as the log is scrolled and, while held,
 * scrolls it back to the top after every change of the editor's measured geometry or
 * heights, which CodeMirror re-estimates when the editor is resized or rescaled.
 * A change of the document before that line drops it.
 */
export const readingPosition = ViewPlugin.fromClass(ReadingPosition, {
    provide: (plugin) =>
        EditorView.updateListener.of((update) => {
            if (update.geometryChanged || update.heightChanged) {
                update.view.plugin(plugin)?.restore();
            }
        }),
});

/** Keeps the line last scrolled to at the top of the editor until the person scrolls or types in it. */
export function holdReadingPosition(view: EditorView) {
    view.plugin(readingPosition)?.hold();
}

/** Lets the editor scroll freely again after a hold. */
export function releaseReadingPosition(view: EditorView) {
    view.plugin(readingPosition)?.release();
}
