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

export const StringUtils = {
    searchSubstring,
    searchFuzzy,
};
