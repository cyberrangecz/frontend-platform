import { Injector } from '@angular/core';
import { EditorState } from '@codemirror/state';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@crczp/components', () => ({ RichTooltipDirective: class {} }));

const { attachmentChips } = await import('./attachment-chips.extensions');
// from './attachment-chips.extensions';

const REFERENCE = '![a](attachment:aaa)';

function stateOf(doc: string): EditorState {
    return EditorState.create({ doc, extensions: attachmentChips(Injector.create({ providers: [] })) });
}

describe('attachment chips keep references on their own line', () => {
    it('separates a reference typed after text', () => {
        const state = stateOf('see ');
        const next = state.update({ changes: { from: 4, insert: REFERENCE } }).state;
        expect(next.doc.toString()).toBe(`see\n\n${REFERENCE}`);
    });

    it('leaves a reference alone on its line untouched', () => {
        const state = stateOf('one\n\n');
        const next = state.update({ changes: { from: 5, insert: REFERENCE } }).state;
        expect(next.doc.toString()).toBe(`one\n\n${REFERENCE}`);
    });

    it('splits text typed after a reference', () => {
        const state = stateOf(REFERENCE);
        const next = state.update({ changes: { from: REFERENCE.length, insert: ' more' } }).state;
        expect(next.doc.toString()).toBe(`${REFERENCE}\n\nmore`);
    });
});
