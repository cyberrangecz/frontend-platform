import { z } from 'zod';

/** Accepts a string holding at least one non-whitespace character and keeps it untouched. */
export const nonBlankStringSchema = z.string().refine((value) => value.trim().length > 0);

/** Parses JSON text, answering the document or a rejection when the text is not well-formed. */
export function parseJsonDocument(text: string): { document: unknown } | { rejection: string } {
    try {
        return { document: JSON.parse(text) };
    } catch {
        return { rejection: 'The file is not well-formed JSON' };
    }
}
