import { tokenColor } from '../log-token-slots';
import { LOGGING_ERROR_MARKER } from '../logging-error-marker';
import {
    defineRuleHighlighting,
    literalPatternSource,
} from './rule-highlighting';
import { MUTED_TOKEN_STYLE, VALUE_TOKEN_STYLES } from './shared-token-styles';

/**
 * One step of a resource address: a name, optionally indexed by a number or a quoted key.
 */
const ADDRESS_STEP = String.raw`[A-Za-z_][\w-]*(?:\[(?:\d+|"[^"\\]*(?:\\.[^"\\]*)*")\])?`;

/**
 * A resource address: steps joined by dots, at least 2 of them.
 */
const RESOURCE_ADDRESS = String.raw`(?:${ADDRESS_STEP}\.)+${ADDRESS_STEP}`;

/**
 * Highlighting of OpenTofu and Terraform `apply` and `destroy` output printed without colour:
 * resource progress lines, diagnostics, the plan with its diff markers, and the final summary,
 * plus the line marking a log that failed to load.
 */
export const terraformSupport = defineRuleHighlighting({
    name: 'terraform',
    tokens: {
        error: { color: tokenColor('error'), fontWeight: '800' },
        warning: { color: tokenColor('warning'), fontWeight: 'bold' },
        diagnosticContext: MUTED_TOKEN_STYLE,
        heading: { color: tokenColor('heading'), fontWeight: 'bold' },
        resourceAddress: { color: tokenColor('resource') },
        resourceId: { color: tokenColor('resource') },
        inProgress: { color: tokenColor('inProgress') },
        complete: { color: tokenColor('complete') },
        elapsedTime: { color: tokenColor('elapsedTime') },
        planAdd: { color: tokenColor('added'), fontWeight: 'bold' },
        planChange: { color: tokenColor('changed'), fontWeight: 'bold' },
        planDestroy: { color: tokenColor('destroyed'), fontWeight: 'bold' },
        planReplace: { color: tokenColor('replaced'), fontWeight: 'bold' },
        planRead: { color: tokenColor('read'), fontWeight: 'bold' },
        attributeName: { color: tokenColor('attributeName') },
        placeholderValue: MUTED_TOKEN_STYLE,
        comment: MUTED_TOKEN_STYLE,
        ...VALUE_TOKEN_STYLES,
    },
    initialMode: 'output',
    modes: {
        output: {
            rules: [
                { pattern: /Error: .*/, token: 'error', atLineStart: true },
                {
                    pattern: new RegExp(
                        `${literalPatternSource(LOGGING_ERROR_MARKER)}(?: .*)?`,
                    ),
                    token: 'error',
                    atLineStart: true,
                },
                {
                    pattern: /Warning: .*|Warnings:$/,
                    token: 'warning',
                    atLineStart: true,
                },
                {
                    pattern: /\s+with \S.*,$/,
                    token: 'diagnosticContext',
                    atLineStart: true,
                },
                {
                    pattern: /\s+on \S.* line \d+\b.*/,
                    token: 'diagnosticContext',
                    atLineStart: true,
                },
                {
                    pattern: /(?:Apply|Destroy) complete! Resources: .*/,
                    token: 'complete',
                    atLineStart: true,
                },
                {
                    pattern:
                        /Plan: .*|(?:Changes to )?Outputs:$|(?:OpenTofu|Terraform) will perform the following actions:$|No changes\..*/,
                    token: 'heading',
                    atLineStart: true,
                },
                {
                    pattern: new RegExp(
                        String.raw`${RESOURCE_ADDRESS}(?=(?: \(deposed object \w+\))?(?: \([\w-]+\))?: )`,
                    ),
                    token: 'resourceAddress',
                    atLineStart: true,
                },
                {
                    pattern: new RegExp(
                        String.raw`(?<=^\s*# )${RESOURCE_ADDRESS}`,
                    ),
                    token: 'resourceAddress',
                },
                {
                    pattern: /(?<=^\s*)(?:-\/\+|\+\/-)(?= )/,
                    token: 'planReplace',
                },
                { pattern: /(?<=^\s+)\+(?= )/, token: 'planAdd' },
                { pattern: /(?<=^\s+)~(?= )/, token: 'planChange' },
                { pattern: /(?<=^\s+)-(?= )/, token: 'planDestroy' },
                { pattern: /(?<=^\s+)<=(?= )/, token: 'planRead' },
                {
                    pattern:
                        /(?<=: )(?:(?:Creating|Destroying|Modifying|Reading|Refreshing state|Opening|Renewing|Closing|Importing|Preparing import)\.\.\.|Still (?:creating|destroying|modifying|reading|opening|renewing|closing)\.\.\.|Importing from ID "[^"\\]*(?:\\.[^"\\]*)*"\.\.\.|Provisioning with '[^']*'\.\.\.)/,
                    token: 'inProgress',
                },
                {
                    pattern:
                        /(?<=: )(?:(?:Creation|Destruction|Modifications|Read|Open|Renew|Close) complete after|Import complete|Import prepared!)/,
                    token: 'complete',
                },
                { pattern: /(?<=\[)[\w-]+=[^\],]*/, token: 'resourceId' },
                {
                    pattern:
                        /(?:\d+h)?(?:\d+m)?\d+(?:\.\d+)?(?:ms|µs|ns|s)(?: elapsed)?(?![\w.])/u,
                    token: 'elapsedTime',
                },
                {
                    pattern:
                        /# \(\d+ unchanged [\w ]+ hidden\)|# forces replacement/,
                    token: 'comment',
                },
                {
                    pattern:
                        /\((?:known after apply|sensitive value|sensitive)\)|<sensitive>/,
                    token: 'placeholderValue',
                },
                {
                    pattern:
                        /(?<=^\s*(?:[+~-]|-\/\+|\+\/-|<=)?\s*)[A-Za-z_][\w-]*(?=\s*=(?:\s|$))/,
                    token: 'attributeName',
                },
                { pattern: /"[^"\\]*(?:\\.[^"\\]*)*"/, token: 'string' },
                { pattern: /true(?![\w-])/, token: 'booleanTrue' },
                { pattern: /false(?![\w-])/, token: 'booleanFalse' },
                {
                    pattern:
                        /(?<![\w.:-])-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![\w.:-])/,
                    token: 'number',
                },
            ],
        },
    },
});
