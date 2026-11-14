import { describe, expect, it } from 'vitest';
import { distinctSuffixesOf, EMPTY_SUFFIX, hasSuffix, suffixOf } from './file-suffix';

describe('file suffix', () => {
    it('takes the lower-cased text after the last dot', () => {
        expect(suffixOf('Report.PDF')).toBe('pdf');
        expect(suffixOf('logs.tar.gz')).toBe('gz');
    });

    it('treats a name without a dot as having no suffix', () => {
        expect(suffixOf('incident-notes')).toBe(EMPTY_SUFFIX);
    });

    it('treats a dotfile and a trailing dot as having no suffix', () => {
        expect(suffixOf('.bashrc')).toBe(EMPTY_SUFFIX);
        expect(suffixOf('archive.')).toBe(EMPTY_SUFFIX);
    });

    it('lists distinct suffixes sorted, with the empty one last', () => {
        const names = ['b.TXT', 'incident-notes', 'a.log', 'c.txt', '.bashrc', 'd.csv'];
        expect(distinctSuffixesOf(names)).toEqual(['csv', 'log', 'txt', EMPTY_SUFFIX]);
    });

    it('matches the empty suffix only against names without one', () => {
        expect(hasSuffix('incident-notes', EMPTY_SUFFIX)).toBe(true);
        expect(hasSuffix('.bashrc', EMPTY_SUFFIX)).toBe(true);
        expect(hasSuffix('a.txt', EMPTY_SUFFIX)).toBe(false);
        expect(hasSuffix('a.TXT', 'txt')).toBe(true);
        expect(hasSuffix('incident-notes', 'txt')).toBe(false);
    });
});
