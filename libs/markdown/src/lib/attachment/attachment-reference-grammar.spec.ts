import { describe, expect, it } from 'vitest';
import {
    ATTACHMENT_REFERENCE_PATTERN,
    attachmentHashOf,
    attachmentTargetOf,
    attachmentTargetText,
    escapeReferenceLabel,
    maxWidthOf,
    referenceMarkdown,
    referencePartsOf,
    unescapeReferenceLabel,
} from './attachment-reference-grammar';

describe('attachment link targets', () => {
    it('reads the bare hash and no width from a link without parameter', () => {
        expect(attachmentTargetOf('attachment:abc')).toStrictEqual({ hash: 'abc', maxWidth: undefined });
    });

    it('reads the saved width and still returns the bare hash', () => {
        expect(attachmentTargetOf('attachment:abc?maxWidth=480')).toStrictEqual({ hash: 'abc', maxWidth: 480 });
        expect(attachmentHashOf('attachment:abc?maxWidth=480')).toBe('abc');
    });

    it.each(['maxWidth=0', 'maxWidth=-4', 'maxWidth=1.5', 'maxWidth=abc', 'maxWidth=', 'height=5', ''])('treats the query %j as no saved width', (query) => {
        expect(maxWidthOf(query)).toBeUndefined();
        expect(attachmentTargetOf(`attachment:abc?${query}`)?.hash).toBe('abc');
    });

    it('finds the width among other parameters', () => {
        expect(maxWidthOf('x=1&maxWidth=300')).toBe(300);
    });

    it('ignores other URLs', () => {
        expect(attachmentTargetOf('https://example.org')).toBeUndefined();
        expect(attachmentTargetOf('attachment:?maxWidth=5')).toBeUndefined();
        expect(attachmentTargetOf(undefined)).toBeUndefined();
    });

    it('writes the width parameter only when a width is saved', () => {
        expect(attachmentTargetText({ hash: 'abc' })).toBe('abc');
        expect(attachmentTargetText({ hash: 'abc', maxWidth: 480 })).toBe('abc?maxWidth=480');
    });
});

describe('attachment reference pattern', () => {
    const matchOf = (markdown: string) => Array.from(markdown.matchAll(ATTACHMENT_REFERENCE_PATTERN))[0];

    it('reads label, hash and saved width from the match', () => {
        expect(referencePartsOf(matchOf('![a\\]b](attachment:abc?maxWidth=480)'))).toStrictEqual({ hash: 'abc', maxWidth: 480, label: 'a]b' });
    });

    it('reads no width from a reference without a query', () => {
        expect(referencePartsOf(matchOf('[file](attachment:abc)'))).toStrictEqual({ hash: 'abc', maxWidth: undefined, label: 'file' });
    });
});

describe('reference label escaping', () => {
    it('resolves the escapes the writer adds, so a round trip keeps the label', () => {
        const label = 'a\\b[c]';
        expect(unescapeReferenceLabel(escapeReferenceLabel(label))).toBe(label);
    });

    it('keeps a backslash that does not escape punctuation', () => {
        expect(unescapeReferenceLabel('a\\nb')).toBe('a\\nb');
    });

    it('writes a label with a backslash escaped once', () => {
        expect(referenceMarkdown({ hash: 'abc', label: 'a\\b', image: true })).toBe('![a\\\\b](attachment:abc)');
    });
});
