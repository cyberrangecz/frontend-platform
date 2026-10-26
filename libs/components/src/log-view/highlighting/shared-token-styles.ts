import { tokenColor } from '../log-token-slots';
import { TokenStyle } from './rule-highlighting';

/**
 * Style of text that only frames or annotates the log, such as padding, placeholders and notes.
 */
export const MUTED_TOKEN_STYLE = {
    color: tokenColor('comment'),
    fontStyle: 'italic',
} as const satisfies TokenStyle;

/**
 * Styles of the quoted strings, numbers and booleans every log format colours alike.
 */
export const VALUE_TOKEN_STYLES = {
    string: { color: tokenColor('string') },
    number: { color: tokenColor('number'), fontWeight: '600' },
    booleanTrue: { color: tokenColor('booleanTrue'), fontWeight: '800' },
    booleanFalse: { color: tokenColor('booleanFalse'), fontWeight: '800' },
} as const satisfies Record<string, TokenStyle>;
