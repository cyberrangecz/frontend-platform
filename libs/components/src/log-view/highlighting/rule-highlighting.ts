import {
    HighlightStyle,
    StreamLanguage,
    syntaxHighlighting,
} from '@codemirror/language';
import { Tag } from '@lezer/highlight';

/**
 * Visual style of one token kind.
 */
export interface TokenStyle {
    readonly color: string;
    readonly fontWeight?: string;
    readonly fontStyle?: string;
}

/**
 * One highlighting rule, tried at the current position of a line.
 */
export interface HighlightRule<Kind extends string, Mode extends string> {
    /**
     * Matched at the current position only, never further along the line; a match of zero characters
     * counts as no match.
     */
    readonly pattern: RegExp;
    /** Token kind given to the matched text; null leaves it unstyled. */
    readonly token: Kind | null;
    /** Restricts the rule to the first position of a line. */
    readonly atLineStart?: boolean;
    /** Mode the rest of the line and the lines after it are read in once the rule matches. */
    readonly enterMode?: Mode;
}

/**
 * A set of rules that holds from the line it is entered on until the line it is left at.
 */
export interface HighlightMode<Kind extends string, Mode extends string> {
    /** Rules tried in order at each position; the first match wins. */
    readonly rules: readonly HighlightRule<Kind, Mode>[];
    /**
     * Tested at the start of every line read in this mode, consuming nothing; a match returns that line
     * and the lines after it to the initial mode. A blank line is tested as empty text.
     */
    readonly leaveAt?: RegExp;
}

/**
 * Everything one log format's highlighting consists of.
 */
export interface RuleHighlightingDefinition<
    Kind extends string,
    Mode extends string,
> {
    /** Language name, also prefixing every token name; free of dots and spaces. */
    readonly name: string;
    /** Every token kind with its style; a kind is a plain identifier, free of dots and spaces. */
    readonly tokens: Readonly<Record<Kind, TokenStyle>>;
    readonly modes: Readonly<
        Record<Mode, HighlightMode<NoInfer<Kind>, NoInfer<Mode>>>
    >;
    /** Mode the first line is read in, and the mode every left mode returns to. */
    readonly initialMode: NoInfer<Mode>;
}

/**
 * The only state carried from one line to the next.
 */
export interface RuleHighlightingState<Mode extends string> {
    mode: Mode;
}

/**
 * Text no rule covers: a whitespace run, a word run, or a single other character.
 */
const PLAIN_TEXT_RUN = /\s+|[\p{L}\p{N}_]+|[^]/uy;

/**
 * Pattern source matching the text character for character.
 */
export function literalPatternSource(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Turns a pattern into one that matches only at the position set as its last index.
 */
function anchorAtPosition(pattern: RegExp): RegExp {
    return new RegExp(pattern.source, `${pattern.flags.replace(/[gy]/g, '')}y`);
}

/**
 * Length of the match of an anchored pattern starting exactly at the position, 0 when there is none.
 */
function matchLengthAt(
    anchoredPattern: RegExp,
    text: string,
    position: number,
): number {
    anchoredPattern.lastIndex = position;
    return anchoredPattern.test(text)
        ? anchoredPattern.lastIndex - position
        : 0;
}

/**
 * A mode with its patterns anchored and its token kinds turned into token names.
 */
interface AnchoredMode<Mode extends string> {
    readonly rules: readonly {
        readonly pattern: RegExp;
        readonly tokenName: string | null;
        readonly atLineStart: boolean;
        readonly enterMode: Mode | undefined;
    }[];
    readonly leaveAt: RegExp | undefined;
}

/**
 * Builds a CodeMirror stream language and its highlight style from a table of rules.
 * Each token kind gets its own tag, styled as the definition declares it.
 *
 * @param definition Token kinds, modes with their rules, and the mode reading starts in.
 * @returns The language and its syntax highlighting, to be added together to an editor's extensions.
 */
export function defineRuleHighlighting<
    Kind extends string,
    Mode extends string,
>(definition: RuleHighlightingDefinition<Kind, Mode>) {
    const tokenNameOf = (kind: string): string => `${definition.name}-${kind}`;
    const tokenKinds = Object.entries<TokenStyle>(definition.tokens).map(
        ([kind, style]) => ({
            tokenName: tokenNameOf(kind),
            style,
            tag: Tag.define(kind),
        }),
    );
    const anchorMode = ({
        rules,
        leaveAt,
    }: HighlightMode<Kind, Mode>): AnchoredMode<Mode> => ({
        rules: rules.map((rule) => ({
            pattern: anchorAtPosition(rule.pattern),
            tokenName: rule.token && tokenNameOf(rule.token),
            atLineStart: rule.atLineStart ?? false,
            enterMode: rule.enterMode,
        })),
        leaveAt: leaveAt && anchorAtPosition(leaveAt),
    });
    const anchoredModes = Object.fromEntries(
        Object.entries<HighlightMode<Kind, Mode>>(definition.modes).map(
            ([mode, highlightMode]) => [mode, anchorMode(highlightMode)],
        ),
    ) as Record<Mode, AnchoredMode<Mode>>;

    const leaveEndedMode = (
        state: RuleHighlightingState<Mode>,
        line: string,
    ): void => {
        const { leaveAt } = anchoredModes[state.mode];
        if (leaveAt) {
            leaveAt.lastIndex = 0;
            if (leaveAt.test(line)) {
                state.mode = definition.initialMode;
            }
        }
    };

    const language = StreamLanguage.define<RuleHighlightingState<Mode>>({
        name: definition.name,
        tokenTable: Object.fromEntries(
            tokenKinds.map(({ tokenName, tag }) => [tokenName, tag]),
        ),
        startState: () => ({ mode: definition.initialMode }),
        blankLine: (state) => leaveEndedMode(state, ''),
        token: (stream, state) => {
            const lineStart = stream.sol();
            if (lineStart) {
                leaveEndedMode(state, stream.string);
            }
            for (const rule of anchoredModes[state.mode].rules) {
                if (rule.atLineStart && !lineStart) {
                    continue;
                }
                const length = matchLengthAt(
                    rule.pattern,
                    stream.string,
                    stream.pos,
                );
                if (length > 0) {
                    stream.pos += length;
                    if (rule.enterMode) {
                        state.mode = rule.enterMode;
                    }
                    return rule.tokenName;
                }
            }
            stream.pos += matchLengthAt(
                PLAIN_TEXT_RUN,
                stream.string,
                stream.pos,
            );
            return null;
        },
    });
    const highlightStyle = HighlightStyle.define(
        tokenKinds.map(({ tag, style }) => ({ tag, ...style })),
    );

    return [language, syntaxHighlighting(highlightStyle)] as const;
}
