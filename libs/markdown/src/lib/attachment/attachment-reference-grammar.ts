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

/** The target and label of a match of {@link ATTACHMENT_REFERENCE_PATTERN}. */
export function referencePartsOf(match: RegExpMatchArray): AttachmentReferenceParts {
    return { ...targetOfText(match[2]), label: unescapeReferenceLabel(match[1]) };
}

/** The markdown of one reference, an image or a link, carrying its saved display width when it has one. */
export function referenceMarkdown({ label, hash, maxWidth, image }: AttachmentReferenceParts & { readonly image: boolean }): string {
    return `${image ? '!' : ''}[${escapeReferenceLabel(label)}](attachment:${attachmentTargetText({ hash, maxWidth })})`;
}
