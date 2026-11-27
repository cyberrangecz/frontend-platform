import { Extension, Prec, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { ATTACHMENT_CHIP_CLASS } from './attachment-chips.extensions';

const DRAGGED_CHIP_CLASS = `${ATTACHMENT_CHIP_CLASS}--dragged`;

/** What the editor does with attachments dragged over it, dropped on it, or dragged out of its chips. */
export interface AttachmentDropHandler {
    /** How a drag over the editor would land: as a copy, as a move, or null for a drag that is no attachment. */
    dropEffectOf(event: DragEvent): 'copy' | 'move' | null;
    /** Puts the dragged attachments in at a line boundary. */
    drop(event: DragEvent, offset: number): void;
    /** Starts dragging the attachment reference a chip stands for. */
    dragChip(event: DragEvent, chip: HTMLElement): void;
}

/** A line boundary a drop lands on, and whether it opens or closes its line. */
interface LineBoundary {
    readonly offset: number;
    readonly side: 'before' | 'after';
}

const showDropLine = StateEffect.define<LineBoundary | null>();

/** Marks the line boundary a drop would land on. */
class DropLineWidget extends WidgetType {
    override eq(): boolean {
        return true;
    }

    toDOM(): HTMLElement {
        const line = document.createElement('div');
        line.className = 'cm-attachment-drop-line';
        line.setAttribute('aria-hidden', 'true');
        return line;
    }
}

const dropLineField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(decorations, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(showDropLine)) {
                const boundary = effect.value;
                return boundary
                    ? Decoration.set(
                          Decoration.widget({ widget: new DropLineWidget(), block: true, side: boundary.side === 'before' ? -1 : 1 }).range(
                              boundary.offset,
                          ),
                      )
                    : Decoration.none;
            }
        }
        return decorations.map(transaction.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
});

const dropLineTheme = EditorView.theme({
    '.cm-attachment-drop-line': { position: 'relative', height: '0' },
    '.cm-attachment-drop-line::before': {
        content: '""',
        position: 'absolute',
        insetInline: '0',
        top: 'calc(-1 * var(--space-4xs) / 2)',
        height: 'var(--space-4xs)',
        borderRadius: 'var(--space-4xs)',
        backgroundColor: 'var(--mat-sys-primary)',
        transformOrigin: 'left center',
        animation: 'cm-attachment-drop-line-in 160ms cubic-bezier(0.05, 0.7, 0.1, 1) both',
    },
    '.cm-attachment-drop-line::after': {
        content: '""',
        position: 'absolute',
        left: 'calc(-1 * var(--space-xs) / 2)',
        top: '0',
        boxSizing: 'border-box',
        width: 'var(--space-xs)',
        height: 'var(--space-xs)',
        border: 'var(--space-4xs) solid var(--mat-sys-primary)',
        borderRadius: '50%',
        backgroundColor: 'var(--mat-sys-surface-container-lowest)',
        transform: 'translateY(-50%)',
    },
    '@keyframes cm-attachment-drop-line-in': {
        from: { opacity: '0', transform: 'scaleX(0.6)' },
    },
    '&:has(.cm-attachment-drop-line) .cm-dropCursor': { display: 'none' },
    [`.${ATTACHMENT_CHIP_CLASS}`]: { transition: 'opacity 120ms ease' },
    [`.${DRAGGED_CHIP_CLASS}`]: { opacity: '0.4' },
});

/**
 * Lets attachments land on line boundaries only, each as a block of its own: a drag carrying
 * attachments shows a line at the boundary nearest the pointer instead of a caret, and dropping
 * hands that boundary to the handler. Chips start their drags through the handler too. Any other
 * drag keeps the editor's own behaviour.
 */
export function attachmentDropHandling(handler: AttachmentDropHandler): Extension {
    let shown: LineBoundary | null = null;
    const show = (view: EditorView, boundary: LineBoundary | null): void => {
        if (shown?.offset !== boundary?.offset || shown?.side !== boundary?.side) {
            shown = boundary;
            view.dispatch({ effects: showDropLine.of(boundary) });
        }
    };
    return [
        dropLineField,
        dropLineTheme,
        chipDragging(handler),
        Prec.highest(
            EditorView.domEventHandlers({
                dragover(event, view) {
                    const effect = handler.dropEffectOf(event);
                    if (!effect) {
                        return false;
                    }
                    event.preventDefault();
                    if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = effect;
                    }
                    show(view, lineBoundaryAt(view, event));
                    return true;
                },
                dragleave(event, view) {
                    if (!(event.relatedTarget instanceof Node && view.dom.contains(event.relatedTarget))) {
                        show(view, null);
                    }
                    return false;
                },
                dragend(_event, view) {
                    show(view, null);
                    return false;
                },
                drop(event, view) {
                    show(view, null);
                    if (!handler.dropEffectOf(event)) {
                        return false;
                    }
                    event.preventDefault();
                    handler.drop(event, lineBoundaryAt(view, event).offset);
                    return true;
                },
            }),
        ),
    ];
}

/**
 * Lets draggable chips start native drags of their own. The editor never sees a press or a drag
 * start on such a chip, so it neither turns the press into a text selection, which would cancel
 * the drag, nor puts the reference markdown on the drag. The chip being dragged stays dimmed until
 * the drag ends, even when the editor redraws it meanwhile.
 */
function chipDragging(handler: AttachmentDropHandler): Extension {
    const dimKey = {};
    return ViewPlugin.define((view) => {
        let draggedFrom: number | null = null;
        const dimDraggedChip = (): void => {
            view.contentDOM
                .querySelectorAll<HTMLElement>(`.${ATTACHMENT_CHIP_CLASS}`)
                .forEach((chip) => chip.classList.toggle(DRAGGED_CHIP_CLASS, view.posAtDOM(chip) === draggedFrom));
        };
        const draggableChipOf = (event: Event): HTMLElement | null => {
            const chip = elementOf(event.target)?.closest<HTMLElement>(`.${ATTACHMENT_CHIP_CLASS}`);
            return chip?.draggable ? chip : null;
        };
        const onMousedown = (event: MouseEvent): void => {
            if (draggableChipOf(event)) {
                event.stopPropagation();
            }
        };
        const onDragstart = (event: DragEvent): void => {
            const chip = draggableChipOf(event);
            if (chip) {
                event.stopPropagation();
                draggedFrom = view.posAtDOM(chip);
                dimDraggedChip();
                handler.dragChip(event, chip);
            }
        };
        const onDragEnd = (): void => {
            draggedFrom = null;
            dimDraggedChip();
        };
        view.dom.addEventListener('mousedown', onMousedown, true);
        view.dom.addEventListener('dragstart', onDragstart, true);
        view.dom.addEventListener('dragend', onDragEnd, true);
        view.dom.addEventListener('drop', onDragEnd, true);
        return {
            update: (update) => {
                if (draggedFrom !== null) {
                    draggedFrom = update.changes.mapPos(draggedFrom);
                    view.requestMeasure({ key: dimKey, read: () => null, write: dimDraggedChip });
                }
            },
            destroy: () => {
                view.dom.removeEventListener('mousedown', onMousedown, true);
                view.dom.removeEventListener('dragstart', onDragstart, true);
                view.dom.removeEventListener('dragend', onDragEnd, true);
                view.dom.removeEventListener('drop', onDragEnd, true);
            },
        };
    });
}

/** The start or end of the document line under the pointer, whichever half of the line the pointer is in. */
function lineBoundaryAt(view: EditorView, event: DragEvent): LineBoundary {
    const line = view.state.doc.lineAt(view.posAtCoords({ x: event.clientX, y: event.clientY }, false));
    const top = view.coordsAtPos(line.from, 1)?.top;
    const bottom = view.coordsAtPos(line.to, -1)?.bottom;
    if (top === undefined || bottom === undefined || event.clientY < (top + bottom) / 2) {
        return { offset: line.from, side: 'before' };
    }
    return { offset: line.to, side: 'after' };
}

function elementOf(target: EventTarget | null): Element | null {
    return target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
}
