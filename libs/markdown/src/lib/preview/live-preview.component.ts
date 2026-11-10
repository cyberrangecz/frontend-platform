import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, Injector, model, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AttachmentRemovalUndo } from '../attachment/attachment-removal-undo.service';
import { attachmentKindOf } from '../attachment/attachment-kind';
import { AttachmentMetadata } from '../attachment/attachment-source';
import { MaterialIntake } from '../attachment/material-intake';
import { TrainingMaterials } from '../attachment/training-materials';
import { AttachmentDragService, carriesFiles } from '../editor/attachment-drag.service';
import { RemovedAttachment } from '../editor/attachment-removal.extensions';
import { BlockEditorExit, BlockSelectionGrowth, BlockSourceEditorComponent, CaretPlacement } from '../editor/block-source-editor.component';
import { ATTACHMENT_CARDS, cardOfKind } from '../media/attachment-cards';
import { FocusStep } from '../media/media-item-actions';
import { insertBlock, referenceMarkdownOf, trailingNewlines } from '../model/attachment-references';
import { MarkdownEdit, relabelReference, relinkReference, removeReference, resizeReference, restoreRemoved, revertEdit } from '../model/level-edits';
import { isMediaOnlyBlock, MarkdownBlock, markdownBlocksOf, MediaReference } from '../model/markdown-blocks';
import { MarkdownBlockComponent } from '../render/markdown-block.component';
import { PreviewBlockDirective } from './preview-block.directive';
import { coveringSpan, draggedSelection, grownSelection, neighbourOf, SourceSpan, TextSelection } from './block-selection';
import { MAX_PREVIEW_WIDTH_PERCENT, MIN_PREVIEW_WIDTH_PERCENT, percentForPointer, PreviewWidth } from './preview-width.service';
import { EditSession, groupDetails, PreviewBlock, PreviewDetails, PreviewEditor, PreviewItem } from './preview-items';

/** Which card of a file block takes focus when the keyboard arrives at the block. */
type CardEdge = 'first' | 'last';

/** Elements inside a rendered block that act on their own instead of opening the block for editing. */
const INTERACTIVE_SELECTOR = 'a, button, input, audio, video, crczp-attachment-media';
const BLOCK_SELECTOR = '.preview-block';
const MEDIA_BLOCK_CLASS = 'preview-block--media';
const TAIL_CLASS = 'preview-tail';
/** How far, in pixels, the pointer may sit from the edge of a media block and still reach the slot beside it. */
const INSERT_SLOT_REACH = 12;
const CARD_SELECTOR = 'crczp-attachment-media';
const HEADING_SOURCE_PATTERN = /^(#{1,6})\s/;
const RULE_SOURCE_PATTERN = /^ {0,3}([-*_])(?: *\1){2,} *$/;
/** Deepest heading level with spacing of its own; deeper headings render alike. */
const DEEPEST_SPACED_HEADING = 4;

/** Vertical spacing a top-level entry keeps around it, as the rendered content spaces that kind of block. */
type EntrySpacing = `heading-${1 | 2 | 3 | 4}` | 'rule';

/** Where a drop lands: the source offset it inserts at, and the height of the gap it shows in, within the page. */
interface DropGap {
    readonly offset: number;
    readonly top: number;
}

/**
 * The markdown rendered block by block as a trainee reads it, and editable in place. Clicking a
 * text block, or pressing Enter on it, swaps that block for its markdown source, marked as the
 * active block. Blocks of files never show their source: each card is one stop of the keyboard,
 * so arrow keys move the source editor across block edges and onto the cards, and from a card on
 * to the next block. Escape or leaving the source editor renders the block again. Where training
 * materials are provided, a material dragged from the materials panel, or files dragged in from
 * outside the browser (stored first), can be dropped between any two blocks; a line marks the gap
 * the drop lands in. From the keyboard, the end of the page opens a block for writing, and
 * Ctrl or Cmd with Enter on a file block writes below it, adding Shift above it.
 */
@Component({
    selector: 'crczp-live-preview',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgTemplateOutlet, MatButtonModule, MatIconModule, MatTooltipModule, MarkdownBlockComponent, BlockSourceEditorComponent, PreviewBlockDirective],
    templateUrl: './live-preview.component.html',
    styleUrl: './live-preview.component.scss',
    host: {
        '(dragover)': 'onDragOver($event)',
        '(dragleave)': 'onDragLeave($event)',
        '(drop)': 'onDrop($event)',
        '(mousemove)': 'onPointerDrag($event); onPointerHover($event)',
        '(mouseleave)': 'insertGap.set(null)',
        '(document:mouseup)': 'dragOrigin = null',
    },
})
export class LivePreviewComponent {
    private readonly removalUndo = inject(AttachmentRemovalUndo);
    private readonly injector = inject(Injector);
    private readonly destroyRef = inject(DestroyRef);
    private readonly drags = inject(AttachmentDragService);
    private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly intake = inject(TrainingMaterials, { optional: true }) ? new MaterialIntake() : null;
    private readonly page = viewChild.required<ElementRef<HTMLElement>>('page');
    private readonly previewWidth = inject(PreviewWidth);
    private readonly cards = inject(ATTACHMENT_CARDS);

    protected readonly widthPercent = this.previewWidth.percent;
    protected readonly widthBounds = { min: MIN_PREVIEW_WIDTH_PERCENT, max: MAX_PREVIEW_WIDTH_PERCENT };
    protected readonly resizing = signal(false);

    readonly markdown = model.required<string>();

    protected readonly dropGap = signal<DropGap | null>(null, {
        equal: (previous, next) => previous?.offset === next?.offset && previous?.top === next?.top,
    });

    /** The gap beside media where a click starts a new text block; it never holds a text block neighbour. */
    protected readonly insertGap = signal<DropGap | null>(null, {
        equal: (previous, next) => previous?.offset === next?.offset && previous?.top === next?.top,
    });

    private readonly session = signal<EditSession | null>(null);
    private readonly openSections = signal<ReadonlySet<string>>(new Set());
    private sessionCount = 0;
    /** The block a pointer drag started on while the button is held; a drag onto other blocks opens them together. */
    protected dragOrigin: SourceSpan | null = null;

    /** The token each block key rendered with last, handed to an unchanged block so its view receives the same input again. */
    private renderedTokens = new Map<string, MarkdownBlock['token']>();

    protected readonly items = computed<readonly PreviewItem[]>(() => {
        const markdown = this.markdown();
        const session = this.session();
        const occurrences = new Map<string, number>();
        const rendered = new Map<string, MarkdownBlock['token']>();
        const asItem = (block: MarkdownBlock): PreviewBlock => {
            const occurrence = (occurrences.get(block.token.raw) ?? 0) + 1;
            occurrences.set(block.token.raw, occurrence);
            const key = `${occurrence}:${block.token.raw}`;
            const token = this.renderedTokens.get(key) ?? block.token;
            rendered.set(key, token);
            return { type: 'block', key, block: { ...block, token }, mediaOnly: isMediaOnlyBlock(token) };
        };
        const entries = session
            ? [
                  ...markdownBlocksOf(markdown.slice(0, session.start)).map(asItem),
                  { type: 'editor', key: `editor:${session.id}`, session } satisfies PreviewEditor,
                  ...markdownBlocksOf(markdown.slice(session.end), session.end).map(asItem),
              ]
            : markdownBlocksOf(markdown).map(asItem);
        this.renderedTokens = rendered;
        return groupDetails(entries);
    });

    constructor() {
        afterNextRender(() => {
            const page = this.page().nativeElement;
            page.addEventListener('keydown', this.onFileBlockKeydown, true);
            this.destroyRef.onDestroy(() => page.removeEventListener('keydown', this.onFileBlockKeydown, true));
        });
    }

    /** Opens a block's markdown source for editing, its caret at the end. */
    edit(block: MarkdownBlock): void {
        this.open(block.start, block.end, 'end');
    }

    /** Takes one attachment reference out of the content and offers to put it back. */
    remove(block: MarkdownBlock, reference: MediaReference): void {
        this.commitEdit(block, removeReference(this.markdown(), block, reference), `Removed ${reference.label || 'attachment'}`);
    }

    /** Points one attachment reference at a stored file under a label and offers to point it back. */
    relink(block: MarkdownBlock, reference: MediaReference, material: AttachmentMetadata, label: string): void {
        const keepsWidth = cardOfKind(this.cards, attachmentKindOf(material)).resizable === true;
        this.commitEdit(block, relinkReference(this.markdown(), block, reference, material.hash, label, keepsWidth), `Linked to ${material.fileName}`);
    }

    relabel(block: MarkdownBlock, reference: MediaReference, label: string): void {
        this.commitEdit(block, relabelReference(this.markdown(), block, reference, label));
    }

    /** Saves a display width into one attachment reference, or removes it when none is given; focus returns to the card only when it was within the block. */
    resize(block: MarkdownBlock, reference: MediaReference, maxWidth: number | undefined): void {
        this.commitEdit(block, resizeReference(this.markdown(), block, reference, maxWidth), undefined, this.holdsFocus(block));
    }

    /** Moves keyboard focus from a card to the next card of its block, or past the block to its neighbour. */
    step(block: MarkdownBlock, card: HTMLElement, direction: FocusStep): void {
        const cards = Array.from(card.closest(BLOCK_SELECTOR)?.querySelectorAll<HTMLElement>(CARD_SELECTOR) ?? []);
        const sibling = cards[cards.indexOf(card) + (direction === 'next' ? 1 : -1)];
        if (sibling) {
            sibling.focus();
        } else {
            this.enterNeighbour(block.start, block.end, direction);
        }
    }

    /**
     * The spacing a block keeps, read from its markdown source: a heading by its level, or a rule.
     * The rendered block and the source editor standing in for it share it, so opening and leaving
     * the editor moves nothing around it.
     */
    protected spacingOf(source: string): EntrySpacing | null {
        const hashes = HEADING_SOURCE_PATTERN.exec(source)?.[1];
        if (hashes) {
            return `heading-${Math.min(hashes.length, DEEPEST_SPACED_HEADING) as 1 | 2 | 3 | 4}`;
        }
        return RULE_SOURCE_PATTERN.test(source.trim()) ? 'rule' : null;
    }

    /** Whether a collapsible section shows its content: when the reader opened it, or while it holds the source editor. */
    protected isOpen(section: PreviewDetails): boolean {
        return this.openSections().has(section.key) || section.children.some((child) => child.type === 'editor');
    }

    protected onSectionToggle(section: PreviewDetails, event: Event): void {
        const open = (event.target as HTMLDetailsElement).open;
        this.openSections.update((keys) => {
            const next = new Set(keys);
            if (open) {
                next.add(section.key);
            } else {
                next.delete(section.key);
            }
            return next;
        });
    }

    protected onBlockMousedown(event: MouseEvent, item: PreviewBlock): void {
        if (event.button !== 0 || item.mediaOnly || (event.target as Element).closest(INTERACTIVE_SELECTOR)) {
            return;
        }
        event.preventDefault();
        this.dragOrigin = { start: item.block.start, end: item.block.end };
        this.open(item.block.start, item.block.end, 'end');
    }

    /** Opens the blocks from the drag's origin to the one under the pointer as one source editor, selected whole. */
    protected onPointerDrag(event: MouseEvent): void {
        const origin = this.dragOrigin;
        if (!origin || !(event.buttons & 1)) {
            this.dragOrigin = null;
            return;
        }
        const offset = (event.target as Element).closest<HTMLElement>(BLOCK_SELECTOR)?.dataset['offset'];
        const target = markdownBlocksOf(this.markdown()).find((block) => block.start === Number(offset));
        if (offset === undefined || !target || (target.start >= origin.start && target.end <= origin.end)) {
            return;
        }
        const covering = coveringSpan(origin, target);
        this.open(covering.start, covering.end, 'end', draggedSelection(origin, target, covering));
    }

    protected onBlockEnter(event: Event, item: PreviewBlock): void {
        if (item.mediaOnly || event.target !== event.currentTarget) {
            return;
        }
        event.preventDefault();
        this.open(item.block.start, item.block.end, 'end');
    }

    /** Opens the last text block at its end, or an empty block after the last file or in empty content. */
    protected onTailActivate(event: Event): void {
        event.preventDefault();
        const markdown = this.markdown();
        const last = markdownBlocksOf(markdown).at(-1);
        if (last && !isMediaOnlyBlock(last.token)) {
            this.open(last.start, last.end, 'end');
            return;
        }
        const extended = last ? markdown + '\n'.repeat(Math.max(0, 2 - trailingNewlines(markdown))) : markdown;
        this.markdown.set(extended);
        this.open(extended.length, extended.length, 'end');
    }

    /** Shows the insert slot while the pointer rests at a media block's edge or between 2 media blocks. */
    protected onPointerHover(event: MouseEvent): void {
        this.insertGap.set(event.buttons === 0 ? this.insertGapAt(event.clientY) : null);
    }

    /** Puts an empty text block into the slot and opens it for typing; it stays when left empty. */
    protected onInsertSlotMousedown(event: MouseEvent, gap: DropGap): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        this.insertGap.set(null);
        this.insertTextBlock(gap.offset);
    }

    /** Opens the text block beside a file block, or puts an empty one between it and the next file block or the page edge. */
    private writeBeside(block: MarkdownBlock, direction: FocusStep): void {
        const blocks = markdownBlocksOf(this.markdown());
        const neighbour = direction === 'previous' ? blocks.filter((candidate) => candidate.end <= block.start).at(-1) : blocks.find((candidate) => candidate.start >= block.end);
        if (neighbour && !isMediaOnlyBlock(neighbour.token)) {
            this.enterNeighbour(block.start, block.end, direction);
        } else {
            this.insertTextBlock(direction === 'previous' ? block.start : (neighbour?.start ?? this.markdown().length));
        }
    }

    private insertTextBlock(offset: number): void {
        const markdown = this.markdown();
        const before = markdown.slice(0, offset);
        const lead = before === '' ? 0 : Math.max(0, 2 - trailingNewlines(before));
        this.markdown.set(insertBlock(markdown, offset, ''));
        this.open(offset + lead, offset + lead, 'end');
    }

    /** Catches Ctrl or Cmd with Enter on a file block before its cards act on the key. */
    private readonly onFileBlockKeydown = (event: KeyboardEvent): void => {
        const target = event.target instanceof Element ? event.target : null;
        const element = target?.closest<HTMLElement>(`.${MEDIA_BLOCK_CLASS}`);
        if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || !element) {
            return;
        }
        const block = markdownBlocksOf(this.markdown()).find((candidate) => candidate.start === Number(element.dataset['offset']));
        if (block) {
            event.preventDefault();
            event.stopPropagation();
            this.writeBeside(block, event.shiftKey ? 'previous' : 'next');
        }
    };

    protected onAttachmentRemoved(sessionId: number, removed: RemovedAttachment): void {
        const session = this.session();
        if (session?.id !== sessionId) {
            return;
        }
        const offset = session.start + removed.from;
        this.removalUndo.offer(() => {
            this.replaceMarkdown(restoreRemoved(this.markdown(), offset, removed.text));
            this.focusEntryAfterRender(session.start);
        });
    }

    protected onEditorText(sessionId: number, text: string): void {
        const session = this.session();
        if (session?.id !== sessionId) {
            return;
        }
        const markdown = this.markdown();
        this.markdown.set(markdown.slice(0, session.start) + text + markdown.slice(session.end));
        this.session.set({ ...session, end: session.start + text.length });
    }

    protected onEditorExit(sessionId: number, exit: BlockEditorExit): void {
        const session = this.session();
        if (session?.id !== sessionId) {
            return;
        }
        if (exit === 'done' || exit === 'escape') {
            this.session.set(null);
            if (exit === 'escape') {
                this.focusEntryAfterRender(session.start);
            }
        } else {
            this.enterNeighbour(session.start, session.end, exit);
        }
    }

    /** Starts a width drag from a hairline; pointer capture keeps it going outside the hairline, for mouse, pen and touch. */
    protected onHairlinePointerDown(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        this.resizing.set(true);
    }

    protected onHairlinePointerMove(event: PointerEvent): void {
        if (this.resizing()) {
            const bounds = this.element.getBoundingClientRect();
            this.previewWidth.set(percentForPointer(event.clientX, bounds.left + bounds.width / 2, bounds.width));
        }
    }

    protected onHairlinePointerEnd(): void {
        if (this.resizing()) {
            this.resizing.set(false);
            this.previewWidth.remember();
        }
    }

    /** Widens or narrows the preview by arrow keys, 5 percentage points a press. */
    protected onHairlineKeydown(event: KeyboardEvent, side: 'start' | 'end'): void {
        const outward = (event.key === 'ArrowRight') === (side === 'end');
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            this.previewWidth.set((this.widthPercent() ?? this.currentPercent()) + (outward ? 5 : -5));
            this.previewWidth.remember();
        }
    }

    private currentPercent(): number {
        return (this.page().nativeElement.offsetWidth / this.element.clientWidth) * 100;
    }

    /** Grows the source editor over the neighbouring block when the keyboard selection runs past its edge. */
    protected onEditorGrowth(sessionId: number, growth: BlockSelectionGrowth): void {
        const session = this.session();
        if (session?.id !== sessionId) {
            return;
        }
        const neighbour = neighbourOf(markdownBlocksOf(this.markdown()), session, growth.direction);
        if (!neighbour) {
            return;
        }
        const grown = coveringSpan(session, neighbour);
        this.open(grown.start, grown.end, 'end', grownSelection(growth, session.start, grown, growth.direction));
    }

    protected onDragOver(event: DragEvent): void {
        if (!this.acceptsDrop(event)) {
            return;
        }
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
        this.dropGap.set(this.gapAt(event.clientY));
    }

    protected onDragLeave(event: DragEvent): void {
        if (!(event.relatedTarget instanceof Node && this.element.contains(event.relatedTarget))) {
            this.dropGap.set(null);
        }
    }

    protected onDrop(event: DragEvent): void {
        const gap = this.dropGap();
        this.dropGap.set(null);
        if (!gap || !this.acceptsDrop(event)) {
            return;
        }
        event.preventDefault();
        const drag = this.drags.dragOf(event);
        if (drag?.kind === 'material') {
            this.insertReferences([drag.material], gap.offset);
        } else {
            this.intake
                ?.take(Array.from(event.dataTransfer?.files ?? []))
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((taken) => this.insertReferences(taken, gap.offset));
        }
    }

    /** Whether a drag carries a stored material, or files from outside the browser that the materials can take. */
    private acceptsDrop(event: DragEvent): boolean {
        const drag = this.drags.dragOf(event);
        return drag ? drag.kind === 'material' : this.intake !== null && carriesFiles(event);
    }

    /** Puts a block of references in at the offset, each file in a block of its own. */
    private insertReferences(files: readonly AttachmentMetadata[], offset: number): void {
        if (files.length > 0) {
            const references = files.map((file) => referenceMarkdownOf(file)).join('\n\n');
            this.replaceMarkdown(insertBlock(this.markdown(), Math.min(offset, this.markdown().length), references));
        }
    }

    /**
     * Finds the gap, between top-level entries or at either end of the page, that holds no text
     * block on either side and lies within reach of the pointer.
     */
    private insertGapAt(clientY: number): DropGap | null {
        const entries = Array.from(this.page().nativeElement.querySelectorAll<HTMLElement>(':scope > [data-offset]')).filter(
            (entry) => !entry.classList.contains(TAIL_CLASS),
        );
        let nearest: { gap: DropGap; distance: number } | null = null;
        for (let index = 0; index <= entries.length; index++) {
            const above = entries[index - 1];
            const below = entries[index];
            if ([above, below].some((entry) => entry && !entry.classList.contains(MEDIA_BLOCK_CLASS))) {
                continue;
            }
            const aboveEdge = above?.getBoundingClientRect().bottom ?? null;
            const belowEdge = below?.getBoundingClientRect().top ?? null;
            const center = ((aboveEdge ?? belowEdge ?? 0) + (belowEdge ?? aboveEdge ?? 0)) / 2;
            const reach = Math.max(INSERT_SLOT_REACH, ((belowEdge ?? center) - (aboveEdge ?? center)) / 2);
            const distance = Math.abs(clientY - center);
            if (distance <= reach && (!nearest || distance < nearest.distance)) {
                const top = above && below ? (above.offsetTop + above.offsetHeight + below.offsetTop) / 2 : above ? above.offsetTop + above.offsetHeight : (below?.offsetTop ?? 0) / 2;
                nearest = { gap: { offset: below ? Number(below.dataset['offset']) : this.markdown().length, top }, distance };
            }
        }
        return nearest?.gap ?? null;
    }

    /**
     * Finds the gap between rendered entries nearest above the pointer. Each gap sits halfway
     * between the entry above and the one below; past the last entry the drop appends.
     */
    private gapAt(clientY: number): DropGap {
        const entries = Array.from(this.page().nativeElement.querySelectorAll<HTMLElement>(':scope > [data-offset]'));
        let previousBottom: number | null = null;
        let gap: DropGap = { offset: this.markdown().length, top: 0 };
        for (const entry of entries) {
            const top = previousBottom === null ? entry.offsetTop / 2 : (previousBottom + entry.offsetTop) / 2;
            gap = { offset: Number(entry.dataset['offset']), top };
            const bounds = entry.getBoundingClientRect();
            if (clientY < bounds.top + bounds.height / 2) {
                return gap;
            }
            previousBottom = entry.offsetTop + entry.offsetHeight;
        }
        return gap;
    }

    /**
     * Takes the keyboard past a block edge to the neighbouring block: a text block opens for
     * editing, a file block focuses the card nearest the edge crossed.
     */
    private enterNeighbour(start: number, end: number, direction: FocusStep): void {
        const blocks = markdownBlocksOf(this.markdown());
        const target = direction === 'previous' ? blocks.filter((block) => block.end <= start).at(-1) : blocks.find((block) => block.start >= end);
        if (!target) {
            return;
        }
        if (!isMediaOnlyBlock(target.token)) {
            this.open(target.start, target.end, direction === 'previous' ? 'end' : 'start');
        } else if (this.session()) {
            this.session.set(null);
            this.focusEntryAfterRender(target.start, direction === 'previous' ? 'last' : 'first');
        } else {
            this.focusEntry(target.start, direction === 'previous' ? 'last' : 'first');
        }
    }

    private focusEntryAfterRender(offset: number, edge: CardEdge = 'first'): void {
        afterNextRender({ read: () => this.focusEntry(offset, edge) }, { injector: this.injector });
    }

    /** Focuses the rendered block holding an offset: a file block through its first or last card. */
    private focusEntry(offset: number, edge: CardEdge): void {
        const blocks = Array.from(this.page().nativeElement.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
        const block = blocks.filter((element) => Number(element.dataset['offset']) <= offset).at(-1) ?? blocks[0];
        const cards = Array.from(block?.querySelectorAll<HTMLElement>(CARD_SELECTOR) ?? []);
        const card = edge === 'first' ? cards[0] : cards.at(-1);
        (card ?? block)?.focus();
    }

    /** Puts an edit of the block's references into the content, hands focus back to the block's first card when asked to, and offers to undo it when a message is given. */
    private commitEdit(block: MarkdownBlock, edit: MarkdownEdit, undoMessage?: string, refocus = true): void {
        this.replaceMarkdown(edit.markdown);
        if (refocus) {
            this.focusEntryAfterRender(block.start);
        }
        if (undoMessage) {
            this.offerUndo(undoMessage, edit);
        }
    }

    /** Whether keyboard focus sits inside the rendered block that starts where the given block does. */
    private holdsFocus(block: MarkdownBlock): boolean {
        const focused = this.page().nativeElement.ownerDocument.activeElement;
        return focused?.closest<HTMLElement>(BLOCK_SELECTOR)?.dataset['offset'] === String(block.start);
    }

    private offerUndo(message: string, edit: MarkdownEdit): void {
        this.removalUndo.offer(() => this.restore(edit), message);
    }

    private restore(edit: MarkdownEdit): void {
        const restored = revertEdit(this.markdown(), edit);
        if (restored !== null) {
            this.replaceMarkdown(restored);
            this.focusEntryAfterRender(edit.start);
        }
    }

    /** Replaces the whole markdown, closing the source editor whose range the change would shift. */
    private replaceMarkdown(markdown: string): void {
        this.session.set(null);
        this.markdown.set(markdown);
    }

    private open(start: number, end: number, caret: CaretPlacement, selection?: TextSelection): void {
        this.session.set({ id: ++this.sessionCount, start, end, caret, selection, initialText: this.markdown().slice(start, end) });
    }
}
