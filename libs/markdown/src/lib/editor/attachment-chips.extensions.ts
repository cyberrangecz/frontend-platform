import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, Injector } from '@angular/core';
import { EditorState, Extension } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { ATTACHMENT_REFERENCE_PATTERN, referencePartsOf } from '../attachment/attachment-reference-grammar';
import { attachmentReferencesIn, blockAfterReferenceLine, changeBetween, lineWithSeparatedReferences, TextChange } from '../model/attachment-references';
import { AttachmentChipComponent } from './attachment-chip.component';

/** Class of the element standing for an attachment reference in the editor. */
export const ATTACHMENT_CHIP_CLASS = 'cm-attachment-chip';

const chipTheme = EditorView.theme({
    [`.${ATTACHMENT_CHIP_CLASS}`]: {
        display: 'inline-flex',
        maxWidth: '100%',
        verticalAlign: 'middle',
        cursor: 'grab',
        userSelect: 'none',
    },
    [`.${ATTACHMENT_CHIP_CLASS}:active`]: { cursor: 'grabbing' },
});

/** Chip components rendered into the widget elements that hold them. */
const chipComponents = new WeakMap<HTMLElement, ComponentRef<AttachmentChipComponent>>();

/**
 * Stands in the editor for one attachment reference, holding an attachment chip component. The
 * component is attached to the application so it redraws when its stored facts arrive.
 */
class AttachmentChipWidget extends WidgetType {
    constructor(
        private readonly label: string,
        private readonly hash: string,
        private readonly maxWidth: number | undefined,
        private readonly injector: Injector,
    ) {
        super();
    }

    override eq(other: AttachmentChipWidget): boolean {
        return other.label === this.label && other.hash === this.hash && other.maxWidth === this.maxWidth;
    }

    toDOM(): HTMLElement {
        const holder = document.createElement('span');
        holder.className = ATTACHMENT_CHIP_CLASS;
        holder.draggable = true;
        holder.addEventListener('click', () => placeCaretAfterChip(holder));
        const chip = createComponent(AttachmentChipComponent, {
            environmentInjector: this.injector.get(EnvironmentInjector),
            elementInjector: this.injector,
        });
        chip.setInput('label', this.label);
        chip.setInput('hash', this.hash);
        chip.setInput('maxWidth', this.maxWidth);
        this.injector.get(ApplicationRef).attachView(chip.hostView);
        holder.append(chip.location.nativeElement);
        chipComponents.set(holder, chip);
        return holder;
    }

    override destroy(dom: HTMLElement): void {
        chipComponents.get(dom)?.destroy();
        chipComponents.delete(dom);
    }

    override ignoreEvent(event: Event): boolean {
        return event.type === 'mousedown';
    }
}

/**
 * Puts the caret after the reference a chip stands for, opening a blank block after it when no
 * text follows.
 */
function placeCaretAfterChip(chip: HTMLElement): void {
    const editor = chip.closest<HTMLElement>('.cm-editor');
    const view = editor && EditorView.findFromDOM(editor);
    if (!view) {
        return;
    }
    const position = view.posAtDOM(chip);
    const line = view.state.doc.lineAt(position);
    const reference = attachmentReferencesIn(line.text, line.from).find(({ from }) => from === position);
    if (!reference) {
        return;
    }
    const markdown = view.state.doc.toString();
    const opened = blockAfterReferenceLine(markdown, line.to);
    const change = opened && changeBetween(markdown, opened.markdown);
    view.dispatch({
        ...(change && (change.from !== change.to || change.insert) ? { changes: change } : {}),
        selection: { anchor: opened?.caret ?? reference.to },
        scrollIntoView: true,
    });
    view.focus();
}

/**
 * Splits every line holding an attachment reference together with other text, or another
 * reference, so each reference stands on a line of its own. It acts on the lines a change touched.
 */
const referencesOnOwnLine = EditorState.transactionFilter.of((transaction) => {
    if (!transaction.docChanged) {
        return transaction;
    }
    const { newDoc } = transaction;
    const changes = new Map<number, TextChange>();
    transaction.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
        for (let number = newDoc.lineAt(fromB).number; number <= newDoc.lineAt(toB).number; number++) {
            const line = newDoc.line(number);
            const separated = line.text.includes('attachment:') ? lineWithSeparatedReferences(line.text) : null;
            if (separated !== null) {
                changes.set(line.from, { from: line.from, to: line.to, insert: separated });
            }
        }
    });
    return changes.size > 0 ? [transaction, { changes: [...changes.values()], sequential: true }] : transaction;
});

/**
 * Shows every attachment reference as an attachment chip, created as a component under the given
 * injector, and keeps each reference on a line of its own. A chip is one unit: the caret steps
 * over it. Chips are draggable; the editor using them handles the drag.
 */
export function attachmentChips(injector: Injector): Extension {
    const decorator = new MatchDecorator({
        regexp: ATTACHMENT_REFERENCE_PATTERN,
        decoration: (match) => {
            const { label, hash, maxWidth } = referencePartsOf(match);
            return Decoration.replace({ widget: new AttachmentChipWidget(label, hash, maxWidth, injector) });
        },
    });
    const plugin = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = decorator.createDeco(view);
            }

            update(update: ViewUpdate): void {
                this.decorations = decorator.updateDeco(update, this.decorations);
            }
        },
        { decorations: (instance) => instance.decorations },
    );
    return [
        plugin,
        EditorView.atomicRanges.of((view) => view.plugin(plugin)?.decorations ?? Decoration.none),
        chipTheme,
        referencesOnOwnLine,
    ];
}
