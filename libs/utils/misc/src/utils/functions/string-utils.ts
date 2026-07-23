/**
 * Tests whether `needle` occurs anywhere in `haystack`, case-insensitively.
 *
 * @param haystack Text to search within.
 * @param needle Substring to look for; an empty needle always matches.
 * @returns `true` when `haystack` contains `needle` regardless of case.
 */
function searchSubstring(haystack: string, needle: string): boolean {
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Tests whether `needle` is a subsequence of `haystack`, case-insensitively.
 * Each character of `needle` must appear in `haystack` in order, but not
 * necessarily consecutively (classic fuzzy/subsequence matching).
 *
 * @param haystack Text to search within.
 * @param needle Pattern to look for as a subsequence; an empty needle always matches.
 * @returns `true` when every character of `needle` appears in order in `haystack`.
 */
function searchFuzzy(haystack: string, needle: string): boolean {
    if (needle.length === 0) return true;
    const lowerHaystack = haystack.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    let needleIndex = 0;
    for (let haystackIndex = 0; haystackIndex < lowerHaystack.length; haystackIndex++) {
        const haystackChar = lowerHaystack[haystackIndex];
        const needleChar = lowerNeedle[needleIndex];
        if (haystackChar !== undefined && needleChar !== undefined && haystackChar === needleChar) {
            needleIndex++;
            if (needleIndex === lowerNeedle.length) return true;
        }
    }
    return false;
}

/** Shared collator: Unicode- and locale-aware, case- and accent-insensitive, numeric-aware. */
const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/**
 * Compares two strings for ordering under Unicode-aware, locale-sensitive collation that folds away
 * case and accent differences and orders embedded digit runs by numeric value.
 *
 * @param first First string.
 * @param second Second string.
 * @returns Negative when `first` orders before `second`, positive when after, zero when they tie.
 */
function compare(first: string, second: string): number {
    return collator.compare(first, second);
}

/**
 * Builds a comparator ordering items by a selected string under the same collation as {@link compare}.
 *
 * @template TItem Item type being ordered.
 * @param select Extracts the string to order each item by.
 * @returns A comparator suitable for `Array.prototype.sort`.
 */
function comparator<TItem>(select: (item: TItem) => string): (first: TItem, second: TItem) => number {
    return (first, second) => collator.compare(select(first), select(second));
}

export const StringUtils = {
    searchSubstring,
    searchFuzzy,
    compare,
    comparator,
};
