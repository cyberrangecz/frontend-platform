const INDENT_UNIT = '  ';
const MAXIMUM_NESTING_DEPTH = 64;
const WHITESPACE_PATTERN = /[ \t\n\r]*/y;
const NUMBER_OR_LITERAL_PATTERN =
    /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|(?:true|false|null)\b/y;
/** Characters a JSON string may hold without an escape. */
const UNESCAPED_STRING_CHARACTERS_PATTERN = /[\x20\x21\x23-\x5B\x5D-￿]*/y;
const ESCAPE_PATTERN = /\\(?:["\\/bfnrt]|u[\dA-Fa-f]{4})/y;
/**
 * Text from a position to the end of the line that may begin a token the line end cut off:
 * a number, a literal or an escape, or no text at all.
 */
const CUT_TOKEN_PATTERN = /[\w.+\-\\]*$/y;

/**
 * Why no fragment was formatted: the text is not a JSON object or array, or the line ends
 * before the fragment does.
 */
type FragmentFailure = 'malformed' | 'unfinished';

interface FormattedFragment {
    /** Index just past the fragment's closing bracket. */
    readonly end: number;
    readonly text: string;
    /** Whether the fragment is an array holding no object or array. */
    readonly isPlainArray: boolean;
}

/**
 * Index just past the match of a sticky pattern at the position, -1 when it does not match there.
 */
function matchEnd(pattern: RegExp, text: string, position: number): number {
    pattern.lastIndex = position;
    return pattern.test(text) ? pattern.lastIndex : -1;
}

/**
 * Re-indents the JSON object or array opening at the start by whitespace only,
 * copying every string, number and literal exactly as written.
 */
function formatFragment(
    line: string,
    start: number,
): FormattedFragment | FragmentFailure {
    let position = start;
    let text = '';
    let hasNestedContainer = false;

    const skipWhitespace = (): void => {
        position = matchEnd(WHITESPACE_PATTERN, line, position);
    };
    const appendElementBreak = (depth: number): void => {
        text += `\n${INDENT_UNIT.repeat(depth)}`;
    };
    const copyTo = (end: number): true => {
        text += line.slice(position, end);
        position = end;
        return true;
    };
    const failAt = (failurePosition: number): false => {
        position = failurePosition;
        return false;
    };

    const readString = (): boolean => {
        let end = position + 1;
        for (;;) {
            end = matchEnd(UNESCAPED_STRING_CHARACTERS_PATTERN, line, end);
            const character = line.charAt(end);
            if (character === '"') {
                return copyTo(end + 1);
            }
            const escapeEnd =
                character === '\\' ? matchEnd(ESCAPE_PATTERN, line, end) : -1;
            if (escapeEnd < 0) {
                return failAt(end);
            }
            end = escapeEnd;
        }
    };

    const readKey = (): boolean => {
        if (line.charAt(position) !== '"' || !readString()) {
            return false;
        }
        skipWhitespace();
        if (line.charAt(position) !== ':') {
            return false;
        }
        text += ': ';
        position++;
        skipWhitespace();
        return true;
    };

    const readComma = (): boolean => {
        if (line.charAt(position) !== ',') {
            return false;
        }
        text += ',';
        position++;
        return true;
    };

    const readValue = (depth: number): boolean => {
        const character = line.charAt(position);
        if (character === '{' || character === '[') {
            return readContainer(character, depth);
        }
        if (character === '"') {
            return readString();
        }
        const end = matchEnd(NUMBER_OR_LITERAL_PATTERN, line, position);
        return end >= 0 && copyTo(end);
    };

    const readContainer = (opener: '{' | '[', depth: number): boolean => {
        if (depth === MAXIMUM_NESTING_DEPTH) {
            return false;
        }
        hasNestedContainer ||= depth > 0;
        const closer = opener === '{' ? '}' : ']';
        text += opener;
        position++;
        skipWhitespace();
        if (line.charAt(position) === closer) {
            text += closer;
            position++;
            return true;
        }
        do {
            skipWhitespace();
            appendElementBreak(depth + 1);
            if ((opener === '{' && !readKey()) || !readValue(depth + 1)) {
                return false;
            }
            skipWhitespace();
        } while (readComma());
        if (line.charAt(position) !== closer) {
            return false;
        }
        appendElementBreak(depth);
        text += closer;
        position++;
        return true;
    };

    const opener = line.charAt(start);
    if (opener !== '{' && opener !== '[') {
        return 'malformed';
    }
    if (readContainer(opener, 0)) {
        return {
            end: position,
            text,
            isPlainArray: opener === '[' && !hasNestedContainer,
        };
    }
    return matchEnd(CUT_TOKEN_PATTERN, line, position) < 0
        ? 'malformed'
        : 'unfinished';
}

/**
 * Re-indents, by whitespace only, each JSON object or array within one line that begins right
 * after a match of the fragment start, whitespace between them allowed.
 * Strings, numbers, keys, duplicate keys and escapes are copied as written. Every other bracket,
 * a fragment that is not well formed, and an array of plain values are left as written, and so
 * is the rest of the line from a fragment the line ends inside of.
 *
 * @param line One line of text, free of line breaks.
 * @param fragmentStart Pattern whose matches end where a fragment may begin.
 * @returns The line with every such fragment re-indented over several lines.
 */
export function formatJsonInLine(line: string, fragmentStart: RegExp): string {
    const startPattern = new RegExp(
        fragmentStart.source,
        `${fragmentStart.flags.replace(/[gy]/g, '')}g`,
    );
    let result = '';
    let copiedUpTo = 0;
    for (
        let match = startPattern.exec(line);
        match;
        match = startPattern.exec(line)
    ) {
        startPattern.lastIndex = Math.max(
            startPattern.lastIndex,
            match.index + 1,
        );
        const fragmentPosition = matchEnd(
            WHITESPACE_PATTERN,
            line,
            match.index + match[0].length,
        );
        const fragment = formatFragment(line, fragmentPosition);
        if (fragment === 'unfinished') {
            break;
        }
        if (fragment !== 'malformed') {
            if (!fragment.isPlainArray) {
                result += line.slice(copiedUpTo, fragmentPosition) + fragment.text;
                copiedUpTo = fragment.end;
            }
            startPattern.lastIndex = fragment.end;
        }
    }
    return result + line.slice(copiedUpTo);
}

/**
 * Applies {@link formatJsonInLine} to each line of the text independently.
 *
 * @param text Text of any number of lines.
 * @param fragmentStart Pattern whose matches end where a fragment may begin.
 */
export function formatJsonInText(text: string, fragmentStart: RegExp): string {
    return text
        .split('\n')
        .map((line) => formatJsonInLine(line, fragmentStart))
        .join('\n');
}
