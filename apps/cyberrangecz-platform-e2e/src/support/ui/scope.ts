import type { Locator, Page } from '@playwright/test';

/** Where a helper searches: a whole page or one region of it. */
export type Scope = Page | Locator;

/** Text to look for: a literal substring or a pattern. */
export type TextMatcher = string | RegExp;

/** Resolves the page a scope belongs to. */
export function pageOf(scope: Scope): Page {
    return 'page' in scope && typeof scope.page === 'function' ? scope.page() : (scope as Page);
}

/** Builds a pattern matching the whole of a text, ignoring surrounding whitespace; `flags` are the regular expression flags, for example `i` to ignore case. */
export function wholeText(text: string, flags?: string): RegExp {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, flags);
}
