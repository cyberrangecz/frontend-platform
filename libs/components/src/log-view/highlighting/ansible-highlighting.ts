import { tokenColor } from '../log-token-slots';
import { LOGGING_ERROR_MARKER } from '../logging-error-marker';
import {
    defineRuleHighlighting,
    HighlightRule,
    literalPatternSource,
    TokenStyle,
} from './rule-highlighting';
import { MUTED_TOKEN_STYLE, VALUE_TOKEN_STYLES } from './shared-token-styles';

/**
 * The arrow of a status line that a task result follows: a space, then the result's JSON object or array.
 */
export const ANSIBLE_RESULT_START = /=>(?= [{[])/;

const ANSIBLE_TOKENS = {
    playHeader: { color: tokenColor('playHeader'), fontWeight: 'bold' },
    taskHeader: { color: tokenColor('taskHeader'), fontWeight: 'bold' },
    padding: MUTED_TOKEN_STYLE,
    taskPath: { color: tokenColor('taskPath'), fontStyle: 'italic' },
    statusOk: { color: tokenColor('statusOk'), fontWeight: 'bold' },
    statusChanged: { color: tokenColor('statusChanged'), fontWeight: 'bold' },
    statusIncluded: { color: tokenColor('statusIncluded'), fontWeight: 'bold' },
    statusSkipping: { color: tokenColor('statusSkipping') },
    statusFailed: { color: tokenColor('statusFailed'), fontWeight: 'bold' },
    statusUnreachable: { color: tokenColor('statusUnreachable'), fontWeight: 'bold' },
    statusIgnoring: { color: tokenColor('statusIgnoring'), fontWeight: 'bold' },
    fatalError: { color: tokenColor('fatalError'), fontWeight: '800' },
    errorLine: { color: tokenColor('errorLine'), fontWeight: '800' },
    warning: { color: tokenColor('warning'), fontWeight: 'bold' },
    deprecation: {
        color: tokenColor('deprecation'),
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    hostName: { color: tokenColor('hostName'), fontWeight: 'bold' },
    galaxyStage: { color: tokenColor('galaxyStage'), fontWeight: 'bold' },
    settingName: { color: tokenColor('property') },
    arrow: { color: tokenColor('keyword') },
    playRecap: { color: tokenColor('playRecap'), fontWeight: 'bold' },
    recapHost: { color: tokenColor('recapHost'), fontWeight: 'bold' },
    recapOk: { color: tokenColor('recapOk'), fontWeight: 'bold' },
    recapChanged: { color: tokenColor('recapChanged'), fontWeight: 'bold' },
    recapUnreachable: { color: tokenColor('recapUnreachable'), fontWeight: 'bold' },
    recapFailed: { color: tokenColor('recapFailed'), fontWeight: 'bold' },
    recapSkipped: { color: tokenColor('recapSkipped') },
    recapRescued: { color: tokenColor('recapRescued'), fontWeight: 'bold' },
    recapIgnored: { color: tokenColor('recapIgnored'), fontWeight: 'bold' },
    jsonKey: { color: tokenColor('property') },
    ...VALUE_TOKEN_STYLES,
    bracket: { color: tokenColor('bracket') },
    timestamp: { color: tokenColor('timestamp'), fontStyle: 'italic' },
    version: { color: tokenColor('version'), fontStyle: 'italic' },
} as const satisfies Record<string, TokenStyle>;

type AnsibleKind = keyof typeof ANSIBLE_TOKENS;
type AnsibleMode = 'playbook' | 'recap' | 'result';
type AnsibleRule = HighlightRule<AnsibleKind, AnsibleMode>;

/**
 * Play, task and handler banners with their star padding.
 */
const BANNER_RULES: readonly AnsibleRule[] = [
    { pattern: /PLAYBOOK: .*/, token: 'playHeader', atLineStart: true },
    {
        pattern: /PLAY RECAP\b.*/,
        token: 'playRecap',
        atLineStart: true,
        enterMode: 'recap',
    },
    { pattern: /PLAY \[.*\]/, token: 'playHeader', atLineStart: true },
    {
        pattern: /(?:TASK|RUNNING HANDLER) \[.*\]/,
        token: 'taskHeader',
        atLineStart: true,
    },
    { pattern: /NO MORE HOSTS LEFT/, token: 'statusFailed', atLineStart: true },
    { pattern: /\*{3,}/, token: 'padding' },
    { pattern: /task path: .*/, token: 'taskPath', atLineStart: true },
];

/**
 * Errors, warnings and deprecations printed outside task results, the line marking a log that
 * failed to load included.
 */
const MESSAGE_RULES: readonly AnsibleRule[] = [
    {
        pattern: new RegExp(
            String.raw`(?:ERROR!|\[ERROR\]:|E:|${literalPatternSource(LOGGING_ERROR_MARKER)})(?: .*|(?!\S))`,
        ),
        token: 'errorLine',
        atLineStart: true,
    },
    { pattern: /\[WARNING\]:/, token: 'warning', atLineStart: true },
    {
        pattern: /\[DEPRECATION WARNING\]:/,
        token: 'deprecation',
        atLineStart: true,
    },
    { pattern: /\.\.\.ignoring/, token: 'statusIgnoring', atLineStart: true },
];

/**
 * A status word with its colon, ending at a space or the end of the line.
 */
const statusWord = (word: string): RegExp => new RegExp(`${word}:(?!\\S)`);

/**
 * Per-host task status lines, such as `fatal: [web -> localhost]: FAILED! => {...}`.
 */
const STATUS_RULES: readonly AnsibleRule[] = [
    { pattern: statusWord('ok'), token: 'statusOk', atLineStart: true },
    {
        pattern: statusWord('changed'),
        token: 'statusChanged',
        atLineStart: true,
    },
    {
        pattern: statusWord('included'),
        token: 'statusIncluded',
        atLineStart: true,
    },
    {
        pattern: /skipping: no hosts matched(?!\S)/,
        token: 'statusSkipping',
        atLineStart: true,
    },
    {
        pattern: statusWord('skipping'),
        token: 'statusSkipping',
        atLineStart: true,
    },
    { pattern: statusWord('failed'), token: 'statusFailed', atLineStart: true },
    { pattern: statusWord('fatal'), token: 'fatalError', atLineStart: true },
    {
        pattern:
            /(?<=^(?:ok|changed|skipping|failed|fatal): )\[[^\s[\]]+(?: -> [^\s[\]]+)?\]/,
        token: 'hostName',
    },
    { pattern: /(?<=\]: )FAILED!/, token: 'statusFailed' },
    { pattern: /(?<=\]: )UNREACHABLE!/, token: 'statusUnreachable' },
    { pattern: ANSIBLE_RESULT_START, token: 'arrow', enterMode: 'result' },
    { pattern: /=>/, token: 'arrow' },
];

/**
 * Role and collection installs printed by `ansible-galaxy`.
 */
const GALAXY_RULES: readonly AnsibleRule[] = [
    {
        pattern:
            /Starting galaxy (?:role|collection) install process|Process install dependency map|Starting collection install process/,
        token: 'galaxyStage',
        atLineStart: true,
    },
    {
        pattern: /(?:- )?\S+(?: \(v?[^\s)]+\))? was installed successfully/,
        token: 'statusOk',
        atLineStart: true,
    },
    {
        pattern:
            /(?:- (?:dependency )?\S+|'[^']+') is already installed, skipping\.|- dependency \S+ already pending installation\.|Nothing to do\. .*/,
        token: 'statusSkipping',
        atLineStart: true,
    },
    {
        pattern:
            /- (?:extracting|downloading role|adding dependency|changing (?:dependent )?role)\b|(?:Installing|Downloading)(?= )/,
        token: 'statusChanged',
        atLineStart: true,
    },
];

/**
 * Settings listed under the `ansible-playbook [core x.y.z]` line of a verbose run.
 */
const SETTING_RULES: readonly AnsibleRule[] = [
    {
        pattern:
            /(?<=^ +)(?:config file|configured module search path|ansible python module location|ansible collection location|executable location|python version|jinja version|pyyaml version|libyaml)(?= = )/,
        token: 'settingName',
    },
];

const DOUBLE_QUOTED_STRING = /"(?:[^"\\]|\\.)*"/;

/**
 * Quoted text, paths, times and versions within prose.
 */
const PROSE_VALUE_RULES: readonly AnsibleRule[] = [
    { pattern: DOUBLE_QUOTED_STRING, token: 'string' },
    {
        pattern: /(?<![\p{L}\p{N}_])'[^']*'(?![\p{L}\p{N}_])/u,
        token: 'string',
    },
    { pattern: /(?<![^\s(])\/[^\s"',;)]+/, token: 'string' },
    {
        pattern:
            /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}|\d+:\d{2}:\d{2}(?:\.\d+)?/,
        token: 'timestamp',
    },
    {
        pattern: /(?<![\p{N}.])v?\d+\.\d+(?:\.\d+)?(?![\p{L}\p{N}_.])/u,
        token: 'version',
    },
];

/**
 * The JSON of a task result, on its status line or spread over the lines after it.
 */
const RESULT_RULES: readonly AnsibleRule[] = [
    {
        pattern: new RegExp(`${DOUBLE_QUOTED_STRING.source}(?=\\s*:)`),
        token: 'jsonKey',
    },
    { pattern: DOUBLE_QUOTED_STRING, token: 'string' },
    { pattern: /true(?![\p{L}\p{N}_])/u, token: 'booleanTrue' },
    { pattern: /false(?![\p{L}\p{N}_])/u, token: 'booleanFalse' },
    {
        pattern: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\p{L}\p{N}_.])/u,
        token: 'number',
    },
    { pattern: /[{}[\]]/, token: 'bracket' },
];

/**
 * Host rows of the PLAY RECAP block; a counter is coloured only when it is not zero.
 */
const RECAP_RULES: readonly AnsibleRule[] = [
    { pattern: /\S+(?= +: )/, token: 'recapHost', atLineStart: true },
    { pattern: /ok=[1-9]\d*/, token: 'recapOk' },
    { pattern: /changed=[1-9]\d*/, token: 'recapChanged' },
    { pattern: /unreachable=[1-9]\d*/, token: 'recapUnreachable' },
    { pattern: /failed=[1-9]\d*/, token: 'recapFailed' },
    { pattern: /skipped=[1-9]\d*/, token: 'recapSkipped' },
    { pattern: /rescued=[1-9]\d*/, token: 'recapRescued' },
    { pattern: /ignored=[1-9]\d*/, token: 'recapIgnored' },
];

/**
 * Highlighting of `ansible-playbook` and `ansible-galaxy` output.
 */
export const ansibleSupport = defineRuleHighlighting({
    name: 'ansible',
    tokens: ANSIBLE_TOKENS,
    initialMode: 'playbook',
    modes: {
        playbook: {
            rules: [
                ...BANNER_RULES,
                ...MESSAGE_RULES,
                ...STATUS_RULES,
                ...GALAXY_RULES,
                ...SETTING_RULES,
                ...PROSE_VALUE_RULES,
            ],
        },
        result: {
            leaveAt: /[^\s}\]]|$/,
            rules: RESULT_RULES,
        },
        recap: {
            leaveAt: /(?!\S+ +: )/,
            rules: RECAP_RULES,
        },
    },
});
