import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, inject, Injector, input, OnInit, output, viewChild } from '@angular/core';
import { CodeEditor } from '@acrodata/code-editor';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { SelectionDirection, TextSelection } from '../preview/block-selection';
import { attachmentChips } from './attachment-chips.extensions';
import { attachmentRemoval, RemovedAttachment } from './attachment-removal.extensions';
import { FormatTargetService } from './format-target.service';
import { FORMAT_TOOLBAR_FOCUS_SELECTOR } from './format-toolbar.component';
import { formatKeymap } from './markdown-format-actions';
import { markdownEditorExtensions } from './markdown-editor.extensions';
import { readingTypeExtensions } from './reading-type.extensions';

/** Width the scroller extends left of the text, so a caret at the start of a line is not clipped by the scroller's edge. */
const CARET_ROOM = '2px';

/** Where the caret lands when the editor opens. */
export type CaretPlacement = 'start' | 'end';

/** A selection growing past the first or last line of the editor, with the selection it held. */
export interface BlockSelectionGrowth extends TextSelection {
    readonly direction: SelectionDirection;
}

/**
 * Why the editor hands the caret back: to the block above, to the block below, out of the content
 * by losing focus, or out of the content by Escape.
 */
export type BlockEditorExit = 'previous' | 'next' | 'done' | 'escape';

/**
 * Markdown source of one block, edited in place in the type of the rendered content, with each
 * attachment reference shown as a chip. Arrow keys past its first or last line, Escape, and
 * losing focus each hand the caret back through the exit output; Escape does not travel on to
 * enclosing dialogs. Removing a chip reports the removed text through attachmentRemoved. The
 * editor registers itself as the target of the formatting toolbar while it is open.
 */
@Component({
    selector: 'crczp-block-source-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CodeEditor],
    templateUrl: './block-source-editor.component.html',
    styleUrl: './block-source-editor.component.scss',
})
export class BlockSourceEditorComponent implements OnInit {
    private readonly formatTarget = inject(FormatTargetService);
    private readonly codeEditor = viewChild(CodeEditor);
    private destroyed = false;

    /** Source the editor starts from; later edits flow out through textChange only. */
    readonly text = input.required<string>();
    readonly caret = input<CaretPlacement>('end');
    /** Selection the editor opens with, taking the place of the caret. */
    readonly selection = input<TextSelection | null>(null);
    readonly textChange = output<string>();
    readonly exit = output<BlockEditorExit>();
    /** The chip a Backspace or Delete took out, positioned within this editor's text. */
    readonly attachmentRemoved = output<RemovedAttachment>();
    readonly growSelection = output<BlockSelectionGrowth>();

    protected initialText = '';

    protected readonly extensions = [
        markdownEditorExtensions,
        readingTypeExtensions,
        attachmentChips(inject(Injector)),
        attachmentRemoval((removed) => this.attachmentRemoved.emit(removed)),
        EditorView.theme({
            '.cm-scroller': { paddingLeft: CARET_ROOM, marginLeft: `-${CARET_ROOM}` },
            '.cm-content': { padding: '0' },
            '.cm-line': { padding: '0' },
        }),
        EditorView.contentAttributes.of({ 'aria-label': 'Markdown source of the block' }),
        Prec.highest(
            keymap.of([
                { key: 'ArrowUp', run: (view) => this.leaveWhen(onFirstVisualLine(view), 'previous') },
                { key: 'ArrowDown', run: (view) => this.leaveWhen(onLastVisualLine(view), 'next') },
                { key: 'Shift-ArrowUp', run: (view) => this.growWhen(onFirstVisualLine(view, false), 'previous', view) },
                { key: 'Shift-PageUp', run: (view) => this.growWhen(onFirstVisualLine(view, false), 'previous', view) },
                { key: 'Shift-ArrowLeft', run: (view) => this.growWhen(view.state.selection.main.head === 0, 'previous', view) },
                { key: 'Mod-Shift-Home', run: (view) => this.growWhen(view.state.selection.main.head === 0, 'previous', view) },
                { key: 'Shift-ArrowDown', run: (view) => this.growWhen(onLastVisualLine(view, false), 'next', view) },
                { key: 'Shift-PageDown', run: (view) => this.growWhen(onLastVisualLine(view, false), 'next', view) },
                { key: 'Shift-ArrowRight', run: (view) => this.growWhen(view.state.selection.main.head === view.state.doc.length, 'next', view) },
                { key: 'Mod-Shift-End', run: (view) => this.growWhen(view.state.selection.main.head === view.state.doc.length, 'next', view) },
                { key: 'Escape', stopPropagation: true, run: () => this.leaveWhen(true, 'escape') },
            ]),
        ),
        formatKeymap,
        EditorView.domEventHandlers({
            blur: (event) => {
                const focusTarget = event.relatedTarget instanceof Element ? event.relatedTarget : null;
                this.leaveWhen(!focusTarget?.closest(FORMAT_TOOLBAR_FOCUS_SELECTOR), 'done');
                return false;
            },
        }),
        EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                this.textChange.emit(update.state.doc.toString());
            }
        }),
    ];

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            this.destroyed = true;
            const view = this.codeEditor()?.view;
            if (view) {
                this.formatTarget.detach(view);
            }
        });
        afterNextRender(() => {
            const view = this.codeEditor()?.view;
            if (view) {
                const anchor = this.caret() === 'start' ? 0 : view.state.doc.length;
                view.dispatch({ selection: this.selection() ?? { anchor }, scrollIntoView: true });
                view.focus();
                this.formatTarget.attach(view);
            }
        });
    }

    ngOnInit(): void {
        this.initialText = this.text();
    }

    private growWhen(condition: boolean, direction: SelectionDirection, view: EditorView): boolean {
        if (!condition || this.destroyed) {
            return false;
        }
        const { anchor, head } = view.state.selection.main;
        this.growSelection.emit({ direction, anchor, head });
        return true;
    }

    private leaveWhen(condition: boolean, exit: BlockEditorExit): boolean {
        if (!condition || this.destroyed) {
            return false;
        }
        this.exit.emit(exit);
        return true;
    }
}

function onFirstVisualLine(view: EditorView, requireEmpty = true): boolean {
    const selection = view.state.selection.main;
    const caret = view.coordsAtPos(selection.head);
    const start = view.coordsAtPos(0);
    return (selection.empty || !requireEmpty) && (!caret || !start || caret.top <= start.top + 1);
}

function onLastVisualLine(view: EditorView, requireEmpty = true): boolean {
    const selection = view.state.selection.main;
    const caret = view.coordsAtPos(selection.head);
    const end = view.coordsAtPos(view.state.doc.length);
    return (selection.empty || !requireEmpty) && (!caret || !end || caret.bottom >= end.bottom - 1);
}
