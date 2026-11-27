import { Tokens } from 'marked';
import { groupSections, markdownBlocksOf, paragraphPartsOf } from './markdown-blocks';

describe('markdown blocks', () => {
    it('splits attachment references out of a paragraph and drops their text', () => {
        const [block] = markdownBlocksOf('See ![a](attachment:abc) and [b](attachment:def)');
        const parts = paragraphPartsOf(block.token.tokens ?? []);
        expect(parts.media.map((reference) => reference.hash)).toEqual(['abc', 'def']);
        expect(parts.inline.map((token) => token.raw).join('')).toBe('See ');
    });

    it('keeps the source range of each block', () => {
        const blocks = markdownBlocksOf('# A\n\ntext\n');
        expect(blocks.map((block) => [block.start, block.end])).toEqual([[0, 3], [5, 9]]);
    });

    it('keeps source ranges for text with carriage return line endings', () => {
        const markdown = '# A\r\n\r\nfirst\r\nline\r\n\r\nnext';
        const blocks = markdownBlocksOf(markdown);
        expect(blocks.map((block) => markdown.slice(block.start, block.end))).toEqual(['# A', 'first\r\nline', 'next']);
    });

    it('keeps source ranges after a repeated link definition', () => {
        const markdown = '[x]: http://a\n[x]: http://b\n\nafter';
        const blocks = markdownBlocksOf(markdown);
        expect(markdown.slice(blocks.at(-1)?.start, blocks.at(-1)?.end)).toBe('after');
    });

    it('measures a nested reference from the start of its top-level block', () => {
        const markdown = '> quote `![a](attachment:abc)`\n> and ![a](attachment:abc)';
        const [block] = markdownBlocksOf(markdown);
        const { media } = paragraphPartsOf((block.token.tokens?.[0] as Tokens.Generic | undefined)?.tokens ?? []);
        expect(media.map((reference) => markdown.startsWith(reference.raw, reference.offset) && reference.offset)).toEqual([markdown.lastIndexOf('![a]')]);
    });
});

describe('groupSections', () => {
    it('gathers the blocks between a details opener and its closing tag into one section', () => {
        const items = groupSections(
            markdownBlocksOf('before\n\n<details>\n<summary>More</summary>\n\ninside\n\n</details>\n\nafter'),
        );
        expect(items.map((item) => item.type)).toEqual(['block', 'section', 'block']);
        const section = items[1];
        expect(section.type === 'section' && section.summary).toBe('More');
        expect(section.type === 'section' && section.blocks.length).toBe(1);
    });

    it('runs a section left open to the last block', () => {
        const items = groupSections(markdownBlocksOf('<details>\n\none\n\ntwo'));
        expect(items.length).toBe(1);
        expect(items[0].type === 'section' && items[0].blocks.length).toBe(2);
    });
});

describe('media references with a saved width', () => {
    it('returns the bare hash and the width, and none without the parameter', () => {
        const [block] = markdownBlocksOf('![a](attachment:abc?maxWidth=480) ![b](attachment:def)');
        const { media } = paragraphPartsOf(block.token.tokens ?? []);
        expect(media.map((reference) => [reference.hash, reference.maxWidth])).toEqual([
            ['abc', 480],
            ['def', undefined],
        ]);
    });
});
