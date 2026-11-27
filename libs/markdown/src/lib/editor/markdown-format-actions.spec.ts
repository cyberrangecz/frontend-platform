import { describe, expect, it } from 'vitest';
import { FORMAT_ACTIONS, formatOutcomeOf } from './markdown-format-actions';

const listActions = [
    { label: 'Add a bullet list', marker: '* ' },
    { label: 'Add a numbered list', marker: '1. ' },
    { label: 'Add a task list', marker: '* [ ] ' },
].map(({ label, marker }) => ({ action: FORMAT_ACTIONS.find((candidate) => candidate.label === label)!, marker }));

describe('list format actions', () => {
    it.each(listActions)('puts the caret right after the marker on an empty selection ($marker)', ({ action, marker }) => {
        const outcome = formatOutcomeOf(action, 4, 4, '');
        expect(outcome.insert).toBe(marker);
        expect(outcome.anchor).toBe(4 + marker.length);
        expect(outcome.head).toBe(outcome.anchor);
    });

    it.each(listActions)('keeps the converted lines selected ($marker)', ({ action, marker }) => {
        const outcome = formatOutcomeOf(action, 2, 9, 'one\ntwo');
        expect(outcome.insert).toBe(`${marker}one\n${marker}two`);
        expect(outcome.anchor).toBe(2);
        expect(outcome.head).toBe(2 + outcome.insert.length);
    });
});

describe('code format action', () => {
    const code = FORMAT_ACTIONS.find((candidate) => candidate.label === 'Insert code')!;

    it('never writes undefined for a selection of only line breaks', () => {
        expect(code.replace('\n\n')).toBe('``');
    });
});
