import { Marked, Token, Tokens } from 'marked';
import { AttachmentTarget, attachmentTargetOf, unescapeReferenceLabel } from '../attachment/attachment-reference-grammar';

/** One attachment a paragraph references, rendered as its own block after the paragraph text. */
export interface MediaReference extends AttachmentTarget {
    /** Alt text of an image reference, or the text of a link reference, with the escaping removed. */
    readonly label: string;
    /** The reference's markdown as written in the source. */
    readonly raw: string;
    /** Where the reference starts in its paragraph's markdown. */
    readonly offset: number;
}

/** A paragraph split into its readable text and the media that follow it. */
export interface ParagraphParts {
    readonly inline: readonly Token[];
    readonly media: readonly MediaReference[];
}

/** A top-level block with the source range its markdown spans, trailing blank lines excluded. */
export interface MarkdownBlock {
    readonly token: Tokens.Generic;
    readonly start: number;
    readonly end: number;
}

const markdownParser = new Marked({ gfm: true, breaks: false, pedantic: false });

/** Words and punctuation that only join references, such as the "and" in "[a] and [b]". */
const CONNECTIVE_PATTERN = /^[\s,;&+/–—-]*(?:(?:and|or)[\s,;&+/–—-]*)*$/i;

/** Lexes markdown into its top-level blocks, with source ranges shifted by an offset. */
export function markdownBlocksOf(markdown: string, offset = 0): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    let position = offset;
    for (const token of markdownParser.lexer(markdown)) {
        const start = position;
        position += token.raw.length;
        if (token.type !== 'space') {
            blocks.push({ token: token as Tokens.Generic, start, end: start + token.raw.trimEnd().length });
        }
    }
    return blocks;
}

/** The attachment an inline token references, or undefined when it references none; the offset is where the token starts in its paragraph. */
export function mediaReferenceOf(token: Token, offset: number): MediaReference | undefined {
    if (token.type !== 'link' && token.type !== 'image') {
        return undefined;
    }
    const reference = token as Tokens.Link | Tokens.Image;
    const target = attachmentTargetOf(reference.href);
    return target && { ...target, label: unescapeReferenceLabel(reference.text), raw: reference.raw, offset };
}

/**
 * Splits a paragraph into its text and its attachment references. Every reference leaves the
 * text, as does a connective word that only joined references at the end.
 */
export function paragraphPartsOf(tokens: readonly Token[]): ParagraphParts {
    const media: MediaReference[] = [];
    const inline: Token[] = [];
    let offset = 0;
    for (const token of tokens) {
        const reference = mediaReferenceOf(token, offset);
        if (reference) {
            media.push(reference);
        } else {
            inline.push(token);
        }
        offset += token.raw.length;
    }
    while (media.length > 0 && inline.length > 0) {
        const last = inline[inline.length - 1];
        if (last.type !== 'text' || !CONNECTIVE_PATTERN.test(last.raw)) {
            break;
        }
        inline.pop();
    }
    return { inline, media };
}

const DETAILS_OPENING_PATTERN = /^\s*<details[\s>]/i;
const DETAILS_CLOSING_PATTERN = /^\s*<\/details>\s*$/i;
const SUMMARY_PATTERN = /<summary[^>]*>([\s\S]*?)(?:<\/summary>|$)/i;
const DEFAULT_SUMMARY = 'Details';

/**
 * The summary of a collapsible section a block opens, or null when the block opens none. A
 * section opens with an HTML block starting with a details tag and runs, across the blocks that
 * follow, up to a block holding only the closing tag.
 */
export function detailsSummaryOf(token: Tokens.Generic): string | null {
    if (token.type !== 'html' || !DETAILS_OPENING_PATTERN.test(token.raw) || token.raw.includes('</details>')) {
        return null;
    }
    const summary = (SUMMARY_PATTERN.exec(token.raw)?.[1] ?? '').replace(/<[^>]*>/g, '').trim();
    return summary || DEFAULT_SUMMARY;
}

/** Whether markdown holds nothing but the tag closing a collapsible section. */
export function isDetailsClosing(markdown: string): boolean {
    return DETAILS_CLOSING_PATTERN.test(markdown);
}

/** A top-level block, or a collapsible section holding the blocks between its opening and closing tags. */
export type MarkdownItem =
    | { readonly type: 'block'; readonly block: MarkdownBlock }
    | { readonly type: 'section'; readonly summary: string; readonly blocks: readonly MarkdownBlock[] };

/**
 * Gathers the blocks between a block opening a collapsible section and the block closing it into
 * one section; a section left open runs to the last block. Other blocks pass through.
 */
export function groupSections(blocks: readonly MarkdownBlock[]): MarkdownItem[] {
    const items: MarkdownItem[] = [];
    let open: MarkdownBlock[] | null = null;
    for (const block of blocks) {
        const summary = detailsSummaryOf(block.token);
        if (open && isDetailsClosing(block.token.raw)) {
            open = null;
        } else if (open) {
            open.push(block);
        } else if (summary !== null) {
            open = [];
            items.push({ type: 'section', summary, blocks: open });
        } else {
            items.push({ type: 'block', block });
        }
    }
    return items;
}

/** Whether a block renders as attachments alone, with no text of its own. */
export function isMediaOnlyBlock(token: Tokens.Generic): boolean {
    if (token.type !== 'paragraph') {
        return false;
    }
    const parts = paragraphPartsOf(token.tokens ?? []);
    return parts.media.length > 0 && parts.inline.length === 0;
}
