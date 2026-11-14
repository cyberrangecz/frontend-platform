import { describe, expect, it } from 'vitest';
import { markdownBlocksOf } from './markdown-blocks';
import { relabelReference, relinkReference, removeReference, resizeReference, restoreRemoved, revertEdit } from './level-edits';
import { paragraphPartsOf } from './markdown-blocks';

const IMAGE = '![diagram](attachment:aaa)';

describe('level edits', () => {
    it('removes a lone reference with its block and reverts it', () => {
        const markdown = `Intro\n\n${IMAGE}\n\nOutro`;
        const block = markdownBlocksOf(markdown)[1];
        const edit = removeReference(markdown, block, { raw: IMAGE, offset: 0 });
        expect(edit.markdown).toBe('Intro\n\nOutro');
        expect(revertEdit(edit.markdown, edit)).toBe(markdown);
    });

    it('keeps blank lines the author added around a removed block', () => {
        const markdown = `Intro\n\n\n${IMAGE}\n\n\n\nOutro`;
        const edit = removeReference(markdown, markdownBlocksOf(markdown)[1], { raw: IMAGE, offset: 0 });
        expect(edit.markdown).toBe('Intro\n\n\n\n\nOutro');
        expect(revertEdit(edit.markdown, edit)).toBe(markdown);
    });

    it('keeps the blank lines of a block lexed from the source', () => {
        const markdown = 'one\n\n\n\ntwo\n\n\n';
        const blocks = markdownBlocksOf(markdown);
        expect(blocks.map((block) => markdown.slice(block.start, block.end))).toEqual(['one', 'two']);
    });

    it('relinks a reference keeping it an image and escaping the label', () => {
        const markdown = `${IMAGE}\n\nText`;
        const block = markdownBlocksOf(markdown)[0];
        const edit = relinkReference(markdown, block, { hash: 'aaa', label: 'diagram', raw: IMAGE, offset: 0 }, 'bbb', 'a]b', true);
        expect(edit.markdown).toBe('![a\\]b](attachment:bbb)\n\nText');
        expect(revertEdit(edit.markdown, edit)).toBe(markdown);
    });

    it('keeps the saved width when relabelling or relinking a reference', () => {
        const sized = '![diagram](attachment:aaa?maxWidth=480)';
        const markdown = `${sized}\n\nText`;
        const block = markdownBlocksOf(markdown)[0];
        const reference = { hash: 'aaa', maxWidth: 480, label: 'diagram', raw: sized, offset: 0 };
        expect(relinkReference(markdown, block, reference, 'aaa', 'new', true).markdown).toBe('![new](attachment:aaa?maxWidth=480)\n\nText');
        expect(relinkReference(markdown, block, reference, 'bbb', 'new', true).markdown).toBe('![new](attachment:bbb?maxWidth=480)\n\nText');
    });

    it('removes a reference carrying a width parameter', () => {
        const sized = '![diagram](attachment:aaa?maxWidth=480)';
        const markdown = `Intro\n\n${sized}\n\nOutro`;
        expect(removeReference(markdown, markdownBlocksOf(markdown)[1], { raw: sized, offset: 0 }).markdown).toBe('Intro\n\nOutro');
    });

    it('refuses to revert when the replaced text has changed', () => {
        const markdown = IMAGE;
        const edit = relinkReference(markdown, markdownBlocksOf(markdown)[0], { hash: 'aaa', label: 'diagram', raw: IMAGE, offset: 0 }, 'bbb', 'x', true);
        expect(revertEdit('changed', edit)).toBeNull();
    });

    it('leaves the markdown intact when the reference to relink is not found', () => {
        const markdown = 'Intro\n\nOutro';
        const edit = relinkReference(markdown, markdownBlocksOf(markdown)[0], { hash: 'aaa', label: 'diagram', raw: IMAGE, offset: 0 }, 'bbb', 'x', true);
        expect(edit.markdown).toBe(markdown);
        expect(revertEdit(edit.markdown, edit)).toBe(markdown);
    });

    it('puts removed text back at its offset, clamped to the end', () => {
        expect(restoreRemoved('ab', 1, 'X')).toBe('aXb');
        expect(restoreRemoved('ab', 9, 'X')).toBe('abX');
    });
});

describe('resizeReference', () => {
    const IMAGE_REFERENCE = '![diagram](attachment:aaa)';
    const markdown = `${IMAGE_REFERENCE}\n\nText`;
    const block = markdownBlocksOf(markdown)[0];

    it('writes the width into the reference', () => {
        const reference = { hash: 'aaa', label: 'diagram', raw: IMAGE_REFERENCE, offset: 0 };
        expect(resizeReference(markdown, block, reference, 480).markdown).toBe('![diagram](attachment:aaa?maxWidth=480)\n\nText');
    });

    it('replaces a saved width and removes it when none is given', () => {
        const sized = '![diagram](attachment:aaa?maxWidth=480)';
        const reference = { hash: 'aaa', maxWidth: 480, label: 'diagram', raw: sized, offset: 0 };
        const sizedMarkdown = `${sized}\n\nText`;
        const sizedBlock = markdownBlocksOf(sizedMarkdown)[0];
        expect(resizeReference(sizedMarkdown, sizedBlock, reference, 300).markdown).toBe('![diagram](attachment:aaa?maxWidth=300)\n\nText');
        expect(resizeReference(sizedMarkdown, sizedBlock, reference, undefined).markdown).toBe(markdown);
    });
});

function mediaReferencesOf(markdown: string) {
    const [block] = markdownBlocksOf(markdown);
    return { block, references: paragraphPartsOf(block.token.tokens ?? []).media };
}

describe('edits of a reference in a block of several', () => {
    const IMAGE_LINE = '![a](attachment:aaa)';

    it('resizes the second of two identical references, not the first', () => {
        const markdown = `${IMAGE_LINE} ${IMAGE_LINE}`;
        const { block, references } = mediaReferencesOf(markdown);
        expect(resizeReference(markdown, block, references[1], 300).markdown).toBe(`${IMAGE_LINE} ![a](attachment:aaa?maxWidth=300)`);
    });

    it('removes the second of two identical references, not the first', () => {
        const markdown = `Look ${IMAGE_LINE} and ${IMAGE_LINE}`;
        const { block, references } = mediaReferencesOf(markdown);
        expect(removeReference(markdown, block, references[1]).markdown).toBe(`Look ${IMAGE_LINE}`);
    });

    it('finds a reference after leading spaces in its paragraph', () => {
        const markdown = `  ${IMAGE_LINE}\n\nText`;
        const { block, references } = mediaReferencesOf(markdown);
        expect(resizeReference(markdown, block, references[0], 300).markdown).toBe('  ![a](attachment:aaa?maxWidth=300)\n\nText');
    });
});

describe('labels with a backslash', () => {
    const SOURCE = '![a\\\\b](attachment:aaa)';
    const markdown = `${SOURCE}\n\nText`;
    const { block, references } = mediaReferencesOf(markdown);

    it('reads the label the way the reader sees it', () => {
        expect(references[0].label).toBe('a\\b');
    });

    it('keeps the label as written when resizing', () => {
        expect(resizeReference(markdown, block, references[0], 300).markdown).toBe('![a\\\\b](attachment:aaa?maxWidth=300)\n\nText');
    });

    it('keeps the label as written when relinking without a new label', () => {
        expect(relinkReference(markdown, block, references[0], 'bbb', references[0].label, true).markdown).toBe('![a\\\\b](attachment:bbb)\n\nText');
    });

    it('writes a new label escaped once when relabelling', () => {
        expect(relabelReference(markdown, block, references[0], 'x\\y').markdown).toBe('![x\\\\y](attachment:aaa)\n\nText');
    });
});

describe('relinking a sized reference', () => {
    const SIZED = '![diagram](attachment:aaa?maxWidth=480)';
    const markdown = `${SIZED}\n\nText`;
    const { block, references } = mediaReferencesOf(markdown);

    it('drops the saved width when the new file does not display at one', () => {
        expect(relinkReference(markdown, block, references[0], 'bbb', 'track', false).markdown).toBe('![track](attachment:bbb)\n\nText');
    });

    it('keeps the saved width when the new file displays at one', () => {
        expect(relinkReference(markdown, block, references[0], 'bbb', 'clip', true).markdown).toBe('![clip](attachment:bbb?maxWidth=480)\n\nText');
    });
});
