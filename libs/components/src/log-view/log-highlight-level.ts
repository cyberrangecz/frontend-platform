import { ansiVariableName } from './log-palette';
import { LOG_TOKEN_SLOTS, LogTokenKind, tokenVariableName } from './log-token-slots';

/**
 * How much of the log is coloured: nothing, errors and warnings, additionally changes, structure
 * and value types, or every token kind.
 */
export type LogHighlightLevel = 'none' | 'errors' | 'reduced' | 'full';

/**
 * Where a token kind takes its colour from: its own ANSI slot, the pale slot, or the preset's
 * plain text colour.
 */
export type LogTokenTreatment = 'coloured' | 'pale' | 'plain';

export const PALE_SLOT = 8;
const PLAIN_COLOR = 'var(--log-foreground)';

const ERROR_KINDS: readonly LogTokenKind[] = [
    'error',
    'fatalError',
    'errorLine',
    'statusFailed',
    'statusUnreachable',
    'recapFailed',
    'recapUnreachable',
    'warning',
    'deprecation',
    'statusIgnoring',
    'recapIgnored',
];

const CHANGE_AND_STRUCTURE_KINDS: readonly LogTokenKind[] = [
    'added',
    'changed',
    'destroyed',
    'replaced',
    'statusChanged',
    'recapChanged',
    'playHeader',
    'taskHeader',
    'heading',
    'playRecap',
];

const VALUE_KINDS: readonly LogTokenKind[] = [
    'string',
    'number',
    'booleanTrue',
    'booleanFalse',
    'timestamp',
    'version',
    'elapsedTime',
];

const PALE_KINDS: readonly LogTokenKind[] = [
    'comment',
    'bracket',
    'taskPath',
    'statusSkipping',
    'recapSkipped',
];

const REDUCED_KINDS = [...ERROR_KINDS, ...CHANGE_AND_STRUCTURE_KINDS, ...VALUE_KINDS];

/**
 * The kinds each level draws in their own colour, and those it draws pale; every other kind of
 * the level is plain text. Full draws every kind in its own colour.
 */
const LEVEL_KINDS: Record<
    Exclude<LogHighlightLevel, 'full'>,
    { readonly coloured: readonly LogTokenKind[]; readonly pale: readonly LogTokenKind[] }
> = {
    none: { coloured: [], pale: [] },
    errors: { coloured: ERROR_KINDS, pale: [] },
    reduced: { coloured: REDUCED_KINDS, pale: PALE_KINDS },
};

/**
 * Every log highlight level, from the least to the most coloured.
 */
export const LOG_HIGHLIGHT_LEVELS: readonly LogHighlightLevel[] = [
    'none',
    'errors',
    'reduced',
    'full',
];

/**
 * How a level draws a token kind.
 */
export function tokenTreatment(level: LogHighlightLevel, kind: LogTokenKind): LogTokenTreatment {
    if (level === 'full') return 'coloured';
    const { coloured, pale } = LEVEL_KINDS[level];
    if (coloured.includes(kind)) return 'coloured';
    return pale.includes(kind) ? 'pale' : 'plain';
}

const TREATED_COLORS: Record<LogTokenTreatment, (kind: LogTokenKind) => string> = {
    coloured: (kind) => `var(${ansiVariableName(LOG_TOKEN_SLOTS[kind])})`,
    pale: () => `var(${ansiVariableName(PALE_SLOT)})`,
    plain: () => PLAIN_COLOR,
};

/**
 * Sets the colour of every token kind for a level as custom properties on an element; the
 * editor inside it recolours without its text being tokenized again.
 */
export function applyLogHighlightLevel(element: HTMLElement, level: LogHighlightLevel): void {
    (Object.keys(LOG_TOKEN_SLOTS) as LogTokenKind[]).forEach((kind) =>
        element.style.setProperty(
            tokenVariableName(kind),
            TREATED_COLORS[tokenTreatment(level, kind)](kind),
        ),
    );
}
