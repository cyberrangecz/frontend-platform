import { Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { attachmentReferencesIn, removalOf } from '../model/attachment-references';

/** The text an attachment removal took out, and where it stood. */
export interface RemovedAttachment {
    readonly from: number;
    readonly text: string;
}

/**
 * Removes the attachment chip next to the caret on Backspace (chip before the caret) or Delete
 * (chip after it), taking its line along, and reports what was removed.
 */
export function attachmentRemoval(onRemoved: (removed: RemovedAttachment, view: EditorView) => void): Extension {
    const removeAdjacent = (side: 'before' | 'after') => (view: EditorView) => {
        const { state } = view;
        const caret = state.selection.main;
        if (state.readOnly || !caret.empty) {
            return false;
        }
        const line = state.doc.lineAt(caret.head);
        const reference = attachmentReferencesIn(line.text, line.from).find((candidate) =>
            side === 'before' ? candidate.to === caret.head : candidate.from === caret.head,
        );
        if (!reference) {
            return false;
        }
        const change = removalOf(state.doc.toString(), reference);
        const text = state.doc.sliceString(change.from, change.to);
        view.dispatch({ changes: change, selection: { anchor: change.from }, userEvent: 'delete.attachment' });
        onRemoved({ from: change.from, text }, view);
        return true;
    };
    return [
        Prec.high(
            keymap.of([
                { key: 'Backspace', run: removeAdjacent('before') },
                { key: 'Delete', run: removeAdjacent('after') },
            ]),
        ),
        reportDeletedSelections(onRemoved),
    ];
}

/**
 * Reports a deletion of a selection or a cut that took attachment references along, with the
 * whole deleted text, so the removal can be offered for undo. Removals of the chip next to the
 * caret report themselves.
 */
function reportDeletedSelections(onRemoved: (removed: RemovedAttachment, view: EditorView) => void): Extension {
    return EditorView.updateListener.of((update) => {
        for (const transaction of update.transactions) {
            if (!transaction.isUserEvent('delete') || transaction.isUserEvent('delete.attachment')) {
                continue;
            }
            transaction.changes.iterChanges((fromA, toA, fromB, toB) => {
                const text = transaction.startState.doc.sliceString(fromA, toA);
                if (toB === fromB && attachmentReferencesIn(text).length > 0) {
                    onRemoved({ from: fromB, text }, update.view);
                }
            });
        }
    });
}
