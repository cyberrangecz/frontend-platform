import { Parser, Token, Tokens } from 'marked';

/** An inline token drawn on its own, or a run of tokens that form one author HTML element. */
export type InlineSegment =
    | { readonly type: 'token'; readonly token: Tokens.Generic }
    | { readonly type: 'html'; readonly html: string };

const OPENING_TAG_PATTERN = /^<([a-z][\w-]*)(?:\s[^>]*)?>$/i;
const CLOSING_TAG_PATTERN = /^<\/([a-z][\w-]*)\s*>$/i;
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** The name of the element a token opens and leaves open, or undefined for any other token. */
function openedElementOf(token: Token): string | undefined {
    if (token.type !== 'html') {
        return undefined;
    }
    const name = OPENING_TAG_PATTERN.exec(token.raw.trim())?.[1].toLowerCase();
    return name && !token.raw.trimEnd().endsWith('/>') && !VOID_ELEMENTS.has(name) ? name : undefined;
}

/** Whether a token is the closing tag of the named element. */
function closesElement(token: Token, name: string): boolean {
    return token.type === 'html' && CLOSING_TAG_PATTERN.exec(token.raw.trim())?.[1].toLowerCase() === name;
}

/** The index after the token closing the element opened at the given index; the end of the tokens when it is never closed. */
function elementEndOf(tokens: readonly Token[], openingIndex: number, name: string): number {
    let depth = 0;
    for (let index = openingIndex; index < tokens.length; index++) {
        if (openedElementOf(tokens[index]) === name) {
            depth++;
        } else if (closesElement(tokens[index], name) && --depth === 0) {
            return index + 1;
        }
    }
    return tokens.length;
}

/**
 * Splits inline tokens into plain tokens and HTML runs. An element opened by an HTML token spans
 * every token up to its closing tag, and the run is converted to one HTML string, markdown inside
 * the element included. Any other HTML token becomes a run of its own.
 */
export function inlineSegmentsOf(tokens: readonly Token[]): InlineSegment[] {
    const segments: InlineSegment[] = [];
    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        if (token.type !== 'html') {
            segments.push({ type: 'token', token: token as Tokens.Generic });
            continue;
        }
        const name = openedElementOf(token);
        const end = name ? elementEndOf(tokens, index, name) : index + 1;
        segments.push({ type: 'html', html: Parser.parseInline(tokens.slice(index, end) as Token[]) });
        index = end - 1;
    }
    return segments;
}
