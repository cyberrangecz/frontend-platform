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
 * neighbours. A reference nested in a list or a blockquote leaves only its own line, the line
 * going too when nothing but its list marker or quote marker is left. The whole block goes, up to
 * the next one, when nothing else is left of it.
 */
export function removeReference(markdown: string, block: MarkdownBlock, reference: Pick<MediaReference, 'raw' | 'offset'>): MarkdownEdit {
    const blockMarkdown = markdown.slice(block.start, block.end);
    const remaining = block.token.type === 'paragraph' ? withoutReference(blockMarkdown, reference) : withoutNestedReference(blockMarkdown, reference);
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

/** Undoes an edit while the markdown is still exactly what the edit made; null once anything has changed since. */
export function revertEdit(markdown: string, edit: MarkdownEdit): string | null {
    if (markdown !== edit.markdown) {
        return null;
    }
    return markdown.slice(0, edit.start) + edit.removed + markdown.slice(edit.start + edit.replacement.length);
}

/**
 * A list or blockquote block without one reference, taken out of its line together with the words
 * joining it there. A line left with nothing but its markers is taken out whole.
 */
function withoutNestedReference(blockMarkdown: string, { raw, offset }: Pick<MediaReference, 'raw' | 'offset'>): string {
    if (!blockMarkdown.startsWith(raw, offset)) {
        return blockMarkdown;
    }
    const lineStart = blockMarkdown.lastIndexOf('\n', offset - 1) + 1;
    const newline = blockMarkdown.indexOf('\n', offset + raw.length);
    const lineEnd = newline < 0 ? blockMarkdown.length : newline;
    const line = blockMarkdown.slice(lineStart, lineEnd);
    const markers = containerMarkersLength(line);
    const content = withoutReference(line.slice(markers), { raw, offset: offset - lineStart - markers });
    if (content) {
        return blockMarkdown.slice(0, lineStart) + line.slice(0, markers) + content + blockMarkdown.slice(lineEnd);
    }
    return lineStart === 0 ? blockMarkdown.slice(lineEnd + 1) : blockMarkdown.slice(0, lineStart - 1) + blockMarkdown.slice(lineEnd);
}

/** How long the run of indentation, quote markers, list markers and task boxes opening a line is. */
function containerMarkersLength(line: string): number {
    let position = 0;
    for (let previous = -1; previous !== position; ) {
        previous = position;
        while (line[position] === ' ' || line[position] === '\t') {
            position++;
        }
        if (line[position] === '>') {
            position++;
            continue;
        }
        let markerEnd = position;
        while (markerEnd - position < 9 && line[markerEnd] >= '0' && line[markerEnd] <= '9') {
            markerEnd++;
        }
        const ordered = markerEnd > position && (line[markerEnd] === '.' || line[markerEnd] === ')');
        const bullet = markerEnd === position && (line[position] === '-' || line[position] === '+' || line[position] === '*');
        const afterMarker = ordered || bullet ? markerEnd + 1 : position;
        if (afterMarker > position && (line[afterMarker] === ' ' || line[afterMarker] === '\t' || afterMarker === line.length)) {
            position = afterMarker;
        } else if (/^\[[ xX]\](?:[ \t]|$)/.test(line.slice(position, position + 4))) {
            position += 3;
        }
    }
    return position;
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
