/**
 * Index of the ANSI colours a token kind can be drawn in.
 */
const SLOT = {
    red: 1,
    green: 2,
    yellow: 3,
    blue: 4,
    magenta: 5,
    cyan: 6,
    brightBlack: 8,
    brightRed: 9,
    brightGreen: 10,
    brightYellow: 11,
    brightBlue: 12,
} as const;

/**
 * The ANSI colour each token kind of the log view is drawn in, grouped by the log format it
 * belongs to: shared kinds, then Terraform, then Ansible.
 */
export const LOG_TOKEN_SLOTS = {
    string: SLOT.green,
    number: SLOT.cyan,
    booleanTrue: SLOT.green,
    booleanFalse: SLOT.red,
    property: SLOT.yellow,
    bracket: SLOT.brightBlack,
    comment: SLOT.brightBlack,
    keyword: SLOT.blue,
    timestamp: SLOT.cyan,
    version: SLOT.brightGreen,

    heading: SLOT.blue,
    resource: SLOT.magenta,
    attributeName: SLOT.yellow,
    inProgress: SLOT.yellow,
    complete: SLOT.green,
    elapsedTime: SLOT.brightBlue,
    error: SLOT.brightRed,
    warning: SLOT.yellow,
    added: SLOT.green,
    changed: SLOT.yellow,
    destroyed: SLOT.red,
    replaced: SLOT.red,
    read: SLOT.cyan,

    playHeader: SLOT.blue,
    taskHeader: SLOT.brightBlue,
    statusOk: SLOT.green,
    statusChanged: SLOT.yellow,
    statusIncluded: SLOT.cyan,
    statusFailed: SLOT.red,
    statusUnreachable: SLOT.brightRed,
    statusIgnoring: SLOT.brightYellow,
    statusSkipping: SLOT.brightBlack,
    deprecation: SLOT.brightYellow,
    fatalError: SLOT.brightRed,
    errorLine: SLOT.brightRed,
    hostName: SLOT.magenta,
    galaxyStage: SLOT.blue,
    taskPath: SLOT.brightBlack,
    playRecap: SLOT.blue,
    recapHost: SLOT.magenta,
    recapOk: SLOT.green,
    recapChanged: SLOT.yellow,
    recapUnreachable: SLOT.brightRed,
    recapFailed: SLOT.red,
    recapSkipped: SLOT.brightBlack,
    recapRescued: SLOT.brightGreen,
    recapIgnored: SLOT.brightYellow,
} as const satisfies Record<string, number>;

/**
 * A token kind of the log view.
 */
export type LogTokenKind = keyof typeof LOG_TOKEN_SLOTS;

/**
 * Name of the custom property holding the colour a token kind is drawn in.
 */
export const tokenVariableName = (kind: LogTokenKind): string => `--log-token-${kind}`;

/**
 * CSS colour of a token kind, resolved by the highlighting level applied on an ancestor element.
 */
export const tokenColor = (kind: LogTokenKind): string => `var(${tokenVariableName(kind)})`;
