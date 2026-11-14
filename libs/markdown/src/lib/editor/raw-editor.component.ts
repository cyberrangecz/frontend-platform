import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    inject,
    input,
    model,
    Injector,
    OnInit,
    untracked,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CodeEditor } from '@acrodata/code-editor';
import { dropCursor, EditorView, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from '@codemirror/view';
import { AttachmentRemovalUndo } from '../attachment/attachment-removal-undo.service';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { MaterialIntake } from '../attachment/material-intake';
import { TrainingMaterials } from '../attachment/training-materials';
import { attachmentReferencesIn, changeBetween, insertBlock, movedReference, referenceMarkdownOf } from '../model/attachment-references';
import { restoreRemoved } from '../model/level-edits';
import { AttachmentDragService, carriesFiles } from './attachment-drag.service';
import { attachmentChips } from './attachment-chips.extensions';
import { attachmentDropHandling } from './attachment-drop.extensions';
import { attachmentRemoval } from './attachment-removal.extensions';
import { FormatTargetService } from './format-target.service';
import { formatKeymap } from './markdown-format-actions';
import { markdownEditorExtensions } from './markdown-editor.extensions';

/**
 * Markdown source in a code editor. Typing writes the markdown model; a markdown value set from
 * outside replaces the document. The editor registers itself as the target of the formatting toolbar.
 */
@Component({
    selector: 'crczp-raw-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CodeEditor],
    templateUrl: './raw-editor.component.html',
    styleUrl: './raw-editor.component.scss',
})
export class RawEditorComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly formatTarget = inject(FormatTargetService);
    private readonly drags = inject(AttachmentDragService);
    private readonly removalUndo = inject(AttachmentRemovalUndo);
    private readonly codeEditor = viewChild(CodeEditor);
    private readonly intake = inject(TrainingMaterials, { optional: true }) ? new MaterialIntake() : null;

    readonly markdown = model.required<string>();
    readonly readonly = input(false);

    /** Text the editor starts from; later edits flow out through the markdown model only. */
    protected initialMarkdown = '';

    protected readonly extensions = [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        dropCursor(),
        formatKeymap,
        markdownEditorExtensions,
        attachmentChips(inject(Injector)),
        attachmentRemoval((removed) => this.removalUndo.offer(() => this.markdown.update((markdown) => restoreRemoved(markdown, removed.from, removed.text)))),
        attachmentDropHandling({
            dropEffectOf: (event) => this.dropEffectOf(event),
            drop: (event, offset) => this.dropAt(event, offset),
            dragChip: (event, chip) => this.startChipDrag(event, chip),
        }),
        EditorView.theme({
            '&': { height: '100%' },
            '.cm-content': { padding: 'var(--space-3xl) 0' },
            '.cm-line': { padding: '0 var(--space-xl) 0 var(--space-md)' },
            '.cm-attachment-drop-line': { margin: '0 var(--space-xl) 0 var(--space-md)' },
            '.cm-gutters': { paddingInlineStart: 'var(--space-md)' },
        }),
        EditorView.contentAttributes.of({ 'aria-label': 'Markdown source' }),
        EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                this.markdown.set(update.state.doc.toString());
            }
        }),
    ];

    constructor() {
        afterNextRender(() => {
            const view = this.codeEditor()?.view;
            if (view) {
                this.formatTarget.attach(view);
                this.destroyRef.onDestroy(() => this.formatTarget.detach(view));
            }
        });
        effect(() => {
            const markdown = this.markdown();
            untracked(() => this.replaceDocument(markdown));
        });
    }

    ngOnInit(): void {
        this.initialMarkdown = this.markdown();
    }

    private startChipDrag(event: DragEvent, chip: HTMLElement): void {
        const view = this.codeEditor()?.view;
        if (!view || this.readonly()) {
            event.preventDefault();
            return;
        }
        const position = view.posAtDOM(chip);
        const line = view.state.doc.lineAt(position);
        const reference = attachmentReferencesIn(line.text, line.from).find(({ from, to }) => from <= position && position <= to);
        if (reference) {
            this.drags.start(event, { kind: 'source', from: reference.from, to: reference.to });
        }
    }

    /** How a drag would land: a chip moves, a material or a file from outside the browser is copied in. */
    private dropEffectOf(event: DragEvent): 'copy' | 'move' | null {
        if (this.readonly()) {
            return null;
        }
        const drag = this.drags.dragOf(event);
        if (drag) {
            return drag.kind === 'source' ? 'move' : 'copy';
        }
        return this.intake && carriesFiles(event) ? 'copy' : null;
    }

    /** Puts what the drag carries into a block of its own at the offset, as one change. */
    private dropAt(event: DragEvent, offset: number): void {
        const drag = this.drags.dragOf(event);
        if (drag?.kind === 'material') {
            this.insertReferences([drag.material], offset);
        } else if (drag?.kind === 'source') {
            this.moveReference(drag, offset);
        } else {
            this.intake
                ?.take(Array.from(event.dataTransfer?.files ?? []))
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((taken) => this.insertReferences(taken, offset));
        }
    }

    private moveReference(drag: { readonly from: number; readonly to: number }, offset: number): void {
        const markdown = this.codeEditor()?.view?.state.doc.toString();
        if (markdown !== undefined) {
            this.replaceSource(movedReference(markdown, drag, offset), 'move.drop');
        }
    }

    private insertReferences(files: readonly AttachmentMetadata[], offset: number): void {
        const view = this.codeEditor()?.view;
        if (view && files.length > 0) {
            const references = files.map((file) => referenceMarkdownOf(file)).join('\n\n');
            this.replaceSource(insertBlock(view.state.doc.toString(), Math.min(offset, view.state.doc.length), references), 'input.drop');
        }
    }

    /** Turns the document into the given markdown with one change, so one undo step reverts it. */
    private replaceSource(markdown: string, userEvent: string): void {
        const view = this.codeEditor()?.view;
        if (!view) {
            return;
        }
        const change = changeBetween(view.state.doc.toString(), markdown);
        if (change.from !== change.to || change.insert) {
            view.dispatch({ changes: change, userEvent });
        }
        view.focus();
    }

    private replaceDocument(markdown: string): void {
        const view = this.codeEditor()?.view;
        const current = view?.state.doc.toString();
        if (view && current !== markdown) {
            view.dispatch({ changes: changeBetween(current, markdown) });
        }
    }
}
