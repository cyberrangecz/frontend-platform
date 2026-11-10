import { describe, expect, it } from 'vitest';
import { attachmentReferencesIn, blockAfterReferenceLine, changeBetween, countReferencesTo, insertBlock, lineWithSeparatedReferences, movedReference, referenceMarkdownOf, removalOf, withoutReferencesTo } from './attachment-references';
import { referenceMarkdown } from '../attachment/attachment-reference-grammar';

const A = '![a](attachment:aaa)';
const B = '[b\\]](attachment:bbb)';

describe('attachment references in markdown source', () => {
    it('finds images and links and unescapes their labels', () => {
        const found = attachmentReferencesIn(`x ${A} ${B}`);
        expect(found.map((reference) => [reference.hash, reference.label])).toEqual([
            ['aaa', 'a'],
            ['bbb', 'b]'],
        ]);
        expect(found[0].from).toBe(2);
    });

    it('leaves a line holding one reference alone and splits any other', () => {
        expect(lineWithSeparatedReferences(A)).toBeNull();
        expect(lineWithSeparatedReferences('plain text')).toBeNull();
        expect(lineWithSeparatedReferences(`see ${A} and ${B}`)).toBe(`see\n\n${A}\n\nand\n\n${B}`);
        expect(lineWithSeparatedReferences(`${A}${B}`)).toBe(`${A}\n\n${B}`);
    });

    it('removes a reference with its line and the blank lines after it', () => {
        const markdown = `one\n\n${A}\n\ntwo`;
        const change = removalOf(markdown, attachmentReferencesIn(markdown)[0]);
        expect(markdown.slice(0, change.from) + markdown.slice(change.to)).toBe('one\n\ntwo');
    });

    it('removes a trailing reference with the blank lines before it', () => {
        const markdown = `one\n\n${A}`;
        const change = removalOf(markdown, attachmentReferencesIn(markdown)[0]);
        expect(markdown.slice(0, change.from)).toBe('one');
    });

    it('removes only the reference when text shares its line', () => {
        const markdown = `see ${A}`;
        const change = removalOf(markdown, attachmentReferencesIn(markdown)[0]);
        expect(markdown.slice(0, change.from) + markdown.slice(change.to)).toBe('see ');
    });

    it('moves a reference to a later and an earlier line boundary', () => {
        const markdown = `one\n\n${A}\n\ntwo\n\nthree`;
        const reference = attachmentReferencesIn(markdown)[0];
        expect(movedReference(markdown, reference, markdown.length)).toBe(`one\n\ntwo\n\nthree\n\n${A}`);
        expect(movedReference(markdown, reference, 0)).toBe(`${A}\n\none\n\ntwo\n\nthree`);
    });

    it('inserts a block between blank lines', () => {
        expect(insertBlock('a\nb', 1, 'X')).toBe('a\n\nX\n\nb');
    });

    it('keeps the blank lines around an inserted block', () => {
        expect(insertBlock('a\n\n\n\nb', 5, 'X')).toBe('a\n\n\n\nX\n\nb');
        expect(insertBlock('a\n\n\n', 4, 'X')).toBe('a\n\n\nX');
        expect(insertBlock('a\n\n\n\nb', 0, 'X')).toBe('X\n\na\n\n\n\nb');
    });

    it('keeps further blank lines when a reference leaves', () => {
        const markdown = `one\n\n${A}\n\n\n\ntwo`;
        const change = removalOf(markdown, attachmentReferencesIn(markdown)[0]);
        expect(markdown.slice(0, change.from) + markdown.slice(change.to)).toBe('one\n\n\n\ntwo');
    });

    it('describes the narrowest change between two texts', () => {
        expect(changeBetween('hello world', 'hello brave world')).toEqual({ from: 6, to: 6, insert: 'brave ' });
        expect(changeBetween('same', 'same')).toEqual({ from: 4, to: 4, insert: '' });
    });

    it('opens a block after a reference that ends the content', () => {
        expect(blockAfterReferenceLine(A, A.length)).toEqual({ markdown: `${A}\n\n`, caret: A.length + 2 });
    });

    it('opens a block between 2 adjacent references', () => {
        const markdown = `${A}\n${B}`;
        expect(blockAfterReferenceLine(markdown, A.length)).toEqual({ markdown: `${A}\n\n\n\n${B}`, caret: A.length + 2 });
        const spaced = `${A}\n\n${B}`;
        expect(blockAfterReferenceLine(spaced, A.length)).toEqual({ markdown: `${A}\n\n\n\n${B}`, caret: A.length + 2 });
    });

    it('opens no block where text follows the reference', () => {
        expect(blockAfterReferenceLine(`${A}\n\ntext`, A.length)).toBeNull();
        expect(blockAfterReferenceLine(`${A}\ntext`, A.length)).toBeNull();
    });
});

describe('attachment references with a saved width', () => {
    const SIZED = '![a](attachment:aaa?maxWidth=480)';

    it('finds the bare hash and the width', () => {
        const [found] = attachmentReferencesIn(`x ${SIZED}`);
        expect([found.hash, found.maxWidth, found.from, found.to]).toEqual(['aaa', 480, 2, 2 + SIZED.length]);
    });

    it('finds a reference with a bad width as one without width', () => {
        const [found] = attachmentReferencesIn('![a](attachment:aaa?maxWidth=-3)');
        expect([found.hash, found.maxWidth]).toEqual(['aaa', undefined]);
    });

    it('counts and removes references by bare hash', () => {
        expect(countReferencesTo(`${SIZED}\n\n${A}`, 'aaa')).toBe(2);
        expect(withoutReferencesTo(`one\n\n${SIZED}\n\ntwo`, 'aaa')).toBe('one\n\ntwo');
    });

    it('moves a reference with its parameter', () => {
        const markdown = `${SIZED}\n\ntext`;
        const moved = movedReference(markdown, attachmentReferencesIn(markdown)[0], markdown.length);
        expect(moved).toContain(SIZED);
    });

    it('splits a line of sized references with the parameters intact', () => {
        expect(lineWithSeparatedReferences(`${SIZED}${B}`)).toBe(`${SIZED}\n\n${B}`);
    });

    it('writes a reference with and without width', () => {
        expect(referenceMarkdown({ label: 'a', hash: 'aaa', maxWidth: 480, image: true })).toBe(SIZED);
        expect(referenceMarkdown({ label: 'a', hash: 'aaa', image: false })).toBe('[a](attachment:aaa)');
        expect(referenceMarkdownOf({ fileName: 'a', hash: 'aaa' })).toBe(A);
    });
});
