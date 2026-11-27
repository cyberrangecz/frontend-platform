/** An attachment a link or image points at: the bare hash and the saved display width, when one is saved. */
export interface AttachmentTarget {
    readonly hash: string;
    /** Display width in CSS px; undefined when the reference carries no valid `maxWidth` parameter. */
    readonly maxWidth?: number;
}

/** An attachment reference as the reader sees it: its target and its label, with the escaping removed. */
export interface AttachmentReferenceParts extends AttachmentTarget {
    readonly label: string;
}

const ATTACHMENT_HREF_PATTERN = /^attachment:([^\s?]+(?:\?\S*)?)$/;
const MAX_WIDTH_PARAMETER_PATTERN = /^maxWidth=([1-9]\d*)$/;

/**
 * A whole `[label](attachment:hash)` link or `![label](attachment:hash)` image, optionally with a
 * `?maxWidth=N` query after the hash; the label is in group 1 and the target text after
 * `attachment:` in group 2.
 */
export const ATTACHMENT_REFERENCE_PATTERN = /!?\[((?:\\.|[^\]\\\n])*)\]\(attachment:([^\s)?]+(?:\?[^\s)]*)?)\)/g;

/** An attachment reference found in a text: where it starts, how long it is, and its target and label. */
export interface FoundAttachmentReference extends AttachmentReferenceParts {
    readonly index: number;
    readonly length: number;
}

const LINE_TERMINATORS = '\n\r\u2028\u2029';
const TARGET_PREFIX = '](attachment:';
const HASH_STOP_PATTERN = /[\s)?]/;
const QUERY_STOP_PATTERN = /[\s)]/;

/**
 * For each position of a text, where a reference label starting there ends: at a closing bracket,
 * a line feed, a backslash with no escapable character after it, or the end of the text.
 */
function labelEndsOf(text: string): Int32Array {
    const ends = new Int32Array(text.length + 1).fill(text.length);
    for (let position = text.length - 1; position >= 0; position--) {
        const character = text[position];
        if (character === '\\') {
            const escaped = text[position + 1];
            ends[position] = escaped !== undefined && !LINE_TERMINATORS.includes(escaped) ? ends[position + 2] : position;
        } else {
            ends[position] = character === ']' || character === '\n' ? position : ends[position + 1];
        }
    }
    return ends;
}

/** For each position of a text, the first position at or after it holding a character the pattern matches, or the text length. */
function stopsOf(text: string, stopPattern: RegExp): Int32Array {
    const stops = new Int32Array(text.length + 1).fill(text.length);
    for (let position = text.length - 1; position >= 0; position--) {
        stops[position] = stopPattern.test(text[position]) ? position : stops[position + 1];
    }
    return stops;
}

/**
 * The attachment references in a text, in order: the same references {@link ATTACHMENT_REFERENCE_PATTERN}
 * matches, found in time linear in the text length.
 */
export function findAttachmentReferences(text: string): FoundAttachmentReference[] {
    const labelEnds = labelEndsOf(text);
    const hashStops = stopsOf(text, HASH_STOP_PATTERN);
    const queryStops = stopsOf(text, QUERY_STOP_PATTERN);
    const references: FoundAttachmentReference[] = [];
    let searchStart = 0;
    for (let open = text.indexOf('['); open >= 0; open = text.indexOf('[', Math.max(open + 1, searchStart))) {
        const labelEnd = labelEnds[open + 1];
        if (!text.startsWith(TARGET_PREFIX, labelEnd)) {
            continue;
        }
        const targetStart = labelEnd + TARGET_PREFIX.length;
        const hashEnd = hashStops[targetStart];
        const targetEnd = text[hashEnd] === '?' ? queryStops[hashEnd + 1] : hashEnd;
        if (hashEnd === targetStart || text[targetEnd] !== ')') {
            continue;
        }
        const index = open > searchStart && text[open - 1] === '!' ? open - 1 : open;
        references.push({ index, length: targetEnd + 1 - index, ...partsOf(text.slice(open + 1, labelEnd), text.slice(targetStart, targetEnd)) });
        searchStart = targetEnd + 1;
    }
    return references;
}

/** The saved display width in a reference's query, undefined when the query holds no positive integer `maxWidth` parameter. */
export function maxWidthOf(query: string | null | undefined): number | undefined {
    const match = query
        ?.split('&')
        .map((parameter) => MAX_WIDTH_PARAMETER_PATTERN.exec(parameter))
        .find(Boolean);
    return match ? Number(match[1]) : undefined;
}

/** The target named by the text after `attachment:`. */
function targetOfText(text: string): AttachmentTarget {
    const queryStart = text.indexOf('?');
    return queryStart < 0 ? { hash: text, maxWidth: undefined } : { hash: text.slice(0, queryStart), maxWidth: maxWidthOf(text.slice(queryStart + 1)) };
}

/** The text after `attachment:` that names a file and, when saved, the width it displays at. */
export function attachmentTargetText({ hash, maxWidth }: AttachmentTarget): string {
    return maxWidth ? `${hash}?maxWidth=${maxWidth}` : hash;
}

/** The attachment an `attachment:` link or image points at, or undefined for any other URL. */
export function attachmentTargetOf(href: string | null | undefined): AttachmentTarget | undefined {
    const match = href ? ATTACHMENT_HREF_PATTERN.exec(href) : null;
    return match ? targetOfText(match[1]) : undefined;
}

/** The hash an `attachment:` link or image points at, or undefined for any other URL. */
export function attachmentHashOf(href: string | null | undefined): string | undefined {
    return attachmentTargetOf(href)?.hash;
}

/** Backslash-escapes the characters that would end or break the bracketed label of a reference. */
export function escapeReferenceLabel(label: string): string {
    return label.replace(/[[\]\\]/g, (character) => `\\${character}`);
}

/** The label a reader sees for source written between a reference's brackets: backslash escapes of punctuation resolved. */
export function unescapeReferenceLabel(source: string): string {
    return source.replace(/\\([!-/:-@[-`{-~])/g, '$1');
}

/** The target and label of a reference, from the source between its brackets and the text after `attachment:`. */
function partsOf(labelSource: string, targetText: string): AttachmentReferenceParts {
    return { ...targetOfText(targetText), label: unescapeReferenceLabel(labelSource) };
}

/** The target and label of a match of {@link ATTACHMENT_REFERENCE_PATTERN}. */
export function referencePartsOf(match: RegExpMatchArray): AttachmentReferenceParts {
    return partsOf(match[1], match[2]);
}

/** The markdown of one reference, an image or a link, carrying its saved display width when it has one. */
export function referenceMarkdown({ label, hash, maxWidth, image }: AttachmentReferenceParts & { readonly image: boolean }): string {
    return `${image ? '!' : ''}[${escapeReferenceLabel(label)}](attachment:${attachmentTargetText({ hash, maxWidth })})`;
}
