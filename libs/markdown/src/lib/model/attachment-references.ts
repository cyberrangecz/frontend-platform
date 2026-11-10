import { AttachmentReferenceParts, ATTACHMENT_REFERENCE_PATTERN, referenceMarkdown, referencePartsOf } from '../attachment/attachment-reference-grammar';

/** A replacement of the text between two offsets. */
export interface TextChange {
    readonly from: number;
    readonly to: number;
    readonly insert: string;
}

/** An attachment reference written in markdown source, with the range it spans. */
export interface AttachmentReferenceSpan extends AttachmentReferenceParts {
    readonly from: number;
    readonly to: number;
}

/** The attachment references in a text, in order, with ranges shifted by an offset. */
export function attachmentReferencesIn(text: string, offset = 0): AttachmentReferenceSpan[] {
    return Array.from(text.matchAll(ATTACHMENT_REFERENCE_PATTERN), (match) => ({
        from: offset + match.index,
        to: offset + match.index + match[0].length,
        ...referencePartsOf(match),
    }));
}

/**
 * The text of a line rewritten so every attachment reference stands in a block of its own,
 * separated from the text around it by blank lines; null when the line already holds at most one
 * reference and nothing else.
 */
export function lineWithSeparatedReferences(line: string): string | null {
    const pieces: string[] = [];
    let position = 0;
    for (const reference of attachmentReferencesIn(line)) {
        pieces.push(line.slice(position, reference.from).trim(), line.slice(reference.from, reference.to));
        position = reference.to;
    }
    pieces.push(line.slice(position).trim());
    const kept = pieces.filter(Boolean);
    return kept.length <= 1 ? null : kept.join('\n\n');
}

/** How many newline characters a text ends with. */
export function trailingNewlines(text: string): number {
    return /\n*$/.exec(text)?.[0].length ?? 0;
}

/** How many newline characters a text starts with. */
function leadingNewlines(text: string): number {
    return /^\n*/.exec(text)?.[0].length ?? 0;
}

const BLOCK_SEPARATOR_NEWLINES = 2;

/**
 * Puts text in as a block of its own at an offset, separated from its neighbours by blank lines.
 * Blank lines already around the offset stay as they are; only missing ones are added.
 */
export function insertBlock(markdown: string, offset: number, text: string): string {
    const before = markdown.slice(0, offset);
    const after = markdown.slice(offset);
    const lead = before === '' ? '' : '\n'.repeat(Math.max(0, BLOCK_SEPARATOR_NEWLINES - trailingNewlines(before)));
    const trail = after === '' ? '' : '\n'.repeat(Math.max(0, BLOCK_SEPARATOR_NEWLINES - leadingNewlines(after)));
    return before + lead + text + trail + after;
}

/** Markdown with an empty block opened for typing, and the offset of the caret inside it. */
export interface OpenedBlock {
    readonly markdown: string;
    readonly caret: number;
}

/**
 * Opens an empty block after the line ending at the given offset, unless text follows it: the
 * block sits where the next block starts, set off by blank lines as an inserted block is. Null
 * when the next non-blank line is text, which already takes the caret there.
 */
export function blockAfterReferenceLine(markdown: string, lineEnd: number): OpenedBlock | null {
    const following = markdown.slice(lineEnd);
    const offset = lineEnd + (/^\n(?:[ \t]*\n)*/.exec(following)?.[0].length ?? 0);
    const nextLine = markdown.slice(offset).split('\n', 1)[0] ?? '';
    if (nextLine.trim() !== '' && attachmentReferencesIn(nextLine).length === 0) {
        return null;
    }
    const lead = offset === 0 ? 0 : Math.max(0, BLOCK_SEPARATOR_NEWLINES - trailingNewlines(markdown.slice(0, offset)));
    return { markdown: insertBlock(markdown, offset, ''), caret: offset + lead };
}

/**
 * The change that takes an attachment reference out of the markdown. A reference alone on its
 * line leaves with its line and the one blank line that separated it from what follows, or from
 * what precedes it when nothing follows; any further blank lines stay.
 */
export function removalOf(markdown: string, reference: Pick<AttachmentReferenceSpan, 'from' | 'to'>): TextChange {
    const before = markdown.slice(0, reference.from);
    const after = markdown.slice(reference.to);
    const aloneOnLine = /(^|\n)[ \t]*$/.test(before) && /^[ \t]*(\n|$)/.test(after);
    if (!aloneOnLine) {
        return { from: reference.from, to: reference.to, insert: '' };
    }
    const from = before.length - (/[ \t]*$/.exec(before)?.[0].length ?? 0);
    const followingNewlines = /^[ \t]*\n{0,2}/.exec(after)?.[0].length ?? 0;
    if (after.trim() === '') {
        const precedingNewlines = Math.min(BLOCK_SEPARATOR_NEWLINES, trailingNewlines(markdown.slice(0, from)));
        return { from: from - precedingNewlines, to: reference.to + followingNewlines, insert: '' };
    }
    return { from, to: reference.to + followingNewlines, insert: '' };
}

/** Moves a reference into a block of its own at an offset of the original markdown. */
export function movedReference(markdown: string, reference: Pick<AttachmentReferenceSpan, 'from' | 'to'>, offset: number): string {
    const removal = removalOf(markdown, reference);
    const removed = markdown.slice(0, removal.from) + markdown.slice(removal.to);
    const target = offset >= removal.to ? offset - (removal.to - removal.from) : Math.min(offset, removal.from);
    return insertBlock(removed, target, markdown.slice(reference.from, reference.to));
}

/** The single replacement turning one text into another, spanning only where they differ. */
export function changeBetween(before: string, after: string): TextChange {
    const shorter = Math.min(before.length, after.length);
    let start = 0;
    while (start < shorter && before[start] === after[start]) {
        start++;
    }
    let end = 0;
    while (end < shorter - start && before[before.length - 1 - end] === after[after.length - 1 - end]) {
        end++;
    }
    return { from: start, to: before.length - end, insert: after.slice(start, after.length - end) };
}

/** The markdown that inlines a file into content: an image reference named after the file, at the default size. */
export function referenceMarkdownOf({ fileName, hash }: { readonly fileName: string; readonly hash: string }): string {
    return referenceMarkdown({ label: fileName, hash, image: true });
}

/** How many references in the markdown point at the file with the hash. */
export function countReferencesTo(markdown: string, hash: string): number {
    return attachmentReferencesIn(markdown).filter((reference) => reference.hash === hash).length;
}

/** The markdown with every reference to the file with the hash taken out. */
export function withoutReferencesTo(markdown: string, hash: string): string {
    return attachmentReferencesIn(markdown)
        .filter((reference) => reference.hash === hash)
        .reduceRight((text, reference) => {
            const change = removalOf(text, reference);
            return text.slice(0, change.from) + change.insert + text.slice(change.to);
        }, markdown);
}
