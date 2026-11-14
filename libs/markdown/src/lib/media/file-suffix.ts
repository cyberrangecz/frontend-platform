/** Suffix shared by every file without one: no dot, a leading dot only, or a trailing dot. */
export const EMPTY_SUFFIX = '';

/** Option label standing for the files without a suffix. */
export const EMPTY_SUFFIX_LABEL = '(empty)';

/**
 * Lower-cased text after the last dot of a file name. A leading dot does not start a suffix, so a
 * dotfile such as `.bashrc` has none, and neither has a name ending in a dot.
 */
export function suffixOf(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : EMPTY_SUFFIX;
}

/** Distinct suffixes of the given file names, sorted, with the empty suffix last. */
export function distinctSuffixesOf(fileNames: readonly string[]): string[] {
    const suffixes = [...new Set(fileNames.map(suffixOf))];
    return suffixes.sort((first, second) => {
        if (first === second) {
            return 0;
        }
        if (first === EMPTY_SUFFIX) {
            return 1;
        }
        return second === EMPTY_SUFFIX ? -1 : first.localeCompare(second);
    });
}

/** Whether a file name has the suffix; the empty suffix matches only names without one. */
export function hasSuffix(fileName: string, suffix: string): boolean {
    return suffixOf(fileName) === suffix;
}
