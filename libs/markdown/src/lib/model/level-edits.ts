import { AttachmentReferenceParts, referenceMarkdown } from '../attachment/attachment-reference-grammar';
import { trailingNewlines } from './attachment-references';
import { MarkdownBlock, markdownBlocksOf, MediaReference } from './markdown-blocks';

/** A change to the markdown, with what it replaced so the change can be undone. */
export interface MarkdownEdit {
    readonly markdown: string;
    readonly start: number;
    /** The text the edit took out, starting at start. */
    readonly removed: string;
    /** The text the edit put in its place. */
    readonly replacement: string;
}

/** Joining words and punctuation that end a text, such as the ", and " before a removed reference. */
const TRAILING_CONNECTIVE = /[\s,;&+/–—-]*(?:\b(?:and|or)\b[\s,;&+/–—-]*)*$/i;
/** Joining words and punctuation that open a text, such as the " and " after a removed reference. */
const LEADING_CONNECTIVE = /^[\s,;&+/–—-]*(?:\b(?:and|or)\b[\s,;&+/–—-]*)*/i;

/**
 * Takes one attachment reference out of its block, with the words that joined it to its
 * neighbours. The whole block goes, up to the next one, when nothing else is left of it.
 */
export function removeReference(markdown: string, block: MarkdownBlock, reference: Pick<MediaReference, 'raw' | 'offset'>): MarkdownEdit {
    const remaining = withoutReference(markdown.slice(block.start, block.end), reference);
    if (remaining) {
        return { markdown: markdown.slice(0, block.start) + remaining + markdown.slice(block.end), start: block.start, removed: markdown.slice(block.start, block.end), replacement: remaining };
    }
    const hasNext = markdownBlocksOf(markdown).some((candidate) => candidate.start >= block.end);
    const following = /^\n{0,2}/.exec(markdown.slice(block.end))?.[0].length ?? 0;
    const preceding = hasNext ? 0 : Math.min(2, trailingNewlines(markdown.slice(0, block.start)));
    const start = block.start - preceding;
    const end = block.end + following;
    return { markdown: markdown.slice(0, start) + markdown.slice(end), start, removed: markdown.slice(start, end), replacement: '' };
}

/**
 * Points one attachment reference at a stored file under a label, keeping it an image or a link.
 * The saved display width stays only when the new file is of a kind that displays at a saved width.
 */
export function relinkReference(markdown: string, block: MarkdownBlock, reference: MediaReference, hash: string, label: string, keepsWidth: boolean): MarkdownEdit {
    return rewriteReference(markdown, block, reference, { hash, label, ...(keepsWidth ? {} : { maxWidth: undefined }) });
}

/** Gives one attachment reference another label, keeping its file and saved display width. */
export function relabelReference(markdown: string, block: MarkdownBlock, reference: MediaReference, label: string): MarkdownEdit {
    return rewriteReference(markdown, block, reference, { label });
}

/** Saves a display width into one attachment reference, or removes the saved width when none is given, keeping the file and label. */
export function resizeReference(markdown: string, block: MarkdownBlock, reference: MediaReference, maxWidth: number | undefined): MarkdownEdit {
    return rewriteReference(markdown, block, reference, { maxWidth });
}

/** Rewrites one attachment reference with the parts given, keeping the rest of it as written; a part given as undefined is dropped. */
function rewriteReference(markdown: string, block: MarkdownBlock, reference: MediaReference, override: Partial<AttachmentReferenceParts>): MarkdownEdit {
    const start = block.start + reference.offset;
    if (!markdown.startsWith(reference.raw, start)) {
        return { markdown, start: block.start, removed: '', replacement: '' };
    }
    const { hash, label, maxWidth } = reference;
    const replacement = referenceMarkdown({ hash, label, maxWidth, ...override, image: reference.raw.startsWith('!') });
    return {
        markdown: markdown.slice(0, start) + replacement + markdown.slice(start + reference.raw.length),
        start,
        removed: reference.raw,
        replacement,
    };
}

/** Puts text taken out of the markdown back at its offset, or at the end when the markdown has since become shorter. */
export function restoreRemoved(markdown: string, offset: number, text: string): string {
    const at = Math.min(offset, markdown.length);
    return markdown.slice(0, at) + text + markdown.slice(at);
}

/** Undoes an edit, as long as the text it put in is still in place; null when it is not. */
export function revertEdit(markdown: string, edit: MarkdownEdit): string | null {
    const replacementEnd = edit.start + edit.replacement.length;
    if (markdown.slice(edit.start, replacementEnd) !== edit.replacement) {
        return null;
    }
    return markdown.slice(0, edit.start) + edit.removed + markdown.slice(replacementEnd);
}

function withoutReference(blockMarkdown: string, { raw, offset }: Pick<MediaReference, 'raw' | 'offset'>): string {
    if (!blockMarkdown.startsWith(raw, offset)) {
        return blockMarkdown;
    }
    const before = blockMarkdown.slice(0, offset);
    const after = blockMarkdown.slice(offset + raw.length);
    const keptBefore = before.replace(TRAILING_CONNECTIVE, '');
    const keptAfter = after.replace(LEADING_CONNECTIVE, '');
    if (!keptBefore || !keptAfter) {
        return (keptBefore + keptAfter).trim();
    }
    const separator = before.slice(keptBefore.length) || ' ';
    return keptBefore + separator + keptAfter;
}
