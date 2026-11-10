import { computed, Injectable, signal } from '@angular/core';
import { EditorView } from '@codemirror/view';
import { applyFormatAction, MarkdownFormatAction } from './markdown-format-actions';

/** The markdown editor the formatting toolbar acts on: the raw source, or the open block of the preview. */
@Injectable()
export class FormatTargetService {
    private readonly target = signal<EditorView | null>(null);

    readonly available = computed(() => this.target() !== null);

    attach(view: EditorView): void {
        this.target.set(view);
    }

    /** Lets go of the editor, unless another one has taken its place already. */
    detach(view: EditorView): void {
        if (this.target() === view) {
            this.target.set(null);
        }
    }

    focus(): void {
        this.target()?.focus();
    }

    apply(action: MarkdownFormatAction): void {
        const view = this.target();
        if (view) {
            applyFormatAction(view, action);
        }
    }
}
