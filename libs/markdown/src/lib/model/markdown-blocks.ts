import { Marked, Token, Tokens } from 'marked';
import { AttachmentTarget, attachmentTargetOf, unescapeReferenceLabel } from '../attachment/attachment-reference-grammar';

/** One attachment a paragraph references, rendered as its own block after the paragraph text. */
export interface MediaReference extends AttachmentTarget {
    /** Alt text of an image reference, or the text of a link reference, with the escaping removed. */
    readonly label: string;
    /** The reference's markdown as written in the source. */
    readonly raw: string;
    /** Where the reference starts in the markdown of the top-level block holding it. */
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

/** Where each link or image token lexed by markdownBlocksOf starts in the source of its top-level block. */
const referenceOffsets = new WeakMap<Token, number>();

/** Words and punctuation that only join references, such as the "and" in "[a] and [b]". */
const CONNECTIVE_PATTERN = /^[\s,;&+/–—-]*(?:(?:and|or)[\s,;&+/–—-]*)*$/i;

/**
 * Lexes markdown into its top-level blocks, with source ranges shifted by an offset. The ranges
 * follow the markdown as given, whatever line endings it uses and whichever lines the lexer emits
 * no token for.
 */
export function markdownBlocksOf(markdown: string, offset = 0): MarkdownBlock[] {
    const source = lineFeedTextOf(markdown);
    const blocks: MarkdownBlock[] = [];
    let position = 0;
    for (const token of markdownParser.lexer(markdown)) {
        const start = tokenStart(source.text, token.raw, position);
        position = start + token.raw.length;
        if (token.type !== 'space') {
            const blockStart = source.originalOffset(start);
            const blockEnd = source.originalOffset(start + token.raw.trimEnd().length);
            recordReferenceOffsets(token, markdown.slice(blockStart, blockEnd));
            blocks.push({ token: token as Tokens.Generic, start: offset + blockStart, end: offset + blockEnd });
        }
    }
    return blocks;
}

/** Markdown with every line ending turned into a line feed, as the lexer reads it, and the way back to offsets of the markdown as given. */
interface LineFeedText {
    readonly text: string;
    originalOffset(position: number): number;
}

function lineFeedTextOf(markdown: string): LineFeedText {
    if (!markdown.includes('\r')) {
        return { text: markdown, originalOffset: (position) => position };
    }
    const origins: number[] = [];
    for (let index = 0; index < markdown.length; index++) {
        origins.push(index);
        if (markdown[index] === '\r' && markdown[index + 1] === '\n') {
            index++;
        }
    }
    origins.push(markdown.length);
    return { text: markdown.replace(/\r\n?/g, '\n'), originalOffset: (position) => origins[position] };
}

/**
 * Where a token's markdown starts in the text: at the position, or at the start of a later line
 * when lines the lexer emits no token for, such as a repeated link definition, come first.
 */
function tokenStart(text: string, raw: string, position: number): number {
    for (let lineStart = position; lineStart < text.length; ) {
        if (text.startsWith(raw, lineStart)) {
            return lineStart;
        }
        const lineEnd = text.indexOf('\n', lineStart);
        if (lineEnd < 0) {
            break;
        }
        lineStart = lineEnd + 1;
    }
    return position;
}

/**
 * Records where each link and image inside a block, nested ones included, starts in the block's
 * source. Tokens are matched to the source in order, so text before a reference, such as the same
 * reference written in a code span, is passed over first.
 */
function recordReferenceOffsets(block: Token, source: string): void {
    if (!source.includes('attachment:')) {
        return;
    }
    let cursor = 0;
    const visit = (token: Token): void => {
        const isReference = token.type === 'link' || token.type === 'image';
        const children = childTokensOf(token);
        if (!isReference && children.length > 0) {
            children.forEach(visit);
            return;
        }
        const at = typeof token.raw === 'string' ? source.indexOf(token.raw, cursor) : -1;
        if (at < 0) {
            return;
        }
        if (isReference) {
            referenceOffsets.set(token, at);
        }
        cursor = at + token.raw.length;
    };
    visit(block);
}

function childTokensOf(token: Token): readonly Token[] {
    if (token.type === 'list') {
        return (token as Tokens.List).items;
    }
    return 'tokens' in token && Array.isArray(token.tokens) ? token.tokens : [];
}

/** The attachment an inline token references, or undefined when it references none; the offset is where the token starts in its block. */
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
        const reference = mediaReferenceOf(token, referenceOffsets.get(token) ?? offset);
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
const SUMMARY_OPENING_PATTERN = /<summary/i;
const SUMMARY_CLOSING_PATTERN = /<\/summary>/i;
const DEFAULT_SUMMARY = 'Details';

/**
 * The HTML after the first summary opening tag, up to its closing tag or the end; empty when the
 * HTML holds no complete summary opening tag.
 */
function summaryContentOf(html: string): string {
    const opening = SUMMARY_OPENING_PATTERN.exec(html);
    const contentStart = opening ? html.indexOf('>', opening.index) + 1 : 0;
    if (contentStart === 0) {
        return '';
    }
    const content = html.slice(contentStart);
    const closing = SUMMARY_CLOSING_PATTERN.exec(content);
    return closing ? content.slice(0, closing.index) : content;
}

/** HTML with every tag, from an opening angle bracket to the next closing one, taken out. */
function withoutTags(html: string): string {
    let text = '';
    let position = 0;
    for (let tagStart = html.indexOf('<'); tagStart >= 0; tagStart = html.indexOf('<', position)) {
        const tagEnd = html.indexOf('>', tagStart);
        if (tagEnd < 0) {
            break;
        }
        text += html.slice(position, tagStart);
        position = tagEnd + 1;
    }
    return text + html.slice(position);
}

/**
 * The summary of a collapsible section a block opens, or null when the block opens none. A
 * section opens with an HTML block starting with a details tag and runs, across the blocks that
 * follow, up to a block holding only the closing tag.
 */
export function detailsSummaryOf(token: Tokens.Generic): string | null {
    if (token.type !== 'html' || !DETAILS_OPENING_PATTERN.test(token.raw) || token.raw.includes('</details>')) {
        return null;
    }
    const summary = withoutTags(summaryContentOf(token.raw)).trim();
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
