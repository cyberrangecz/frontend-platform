/** Prefix marking a base64 payload as an inline PNG data URL. */
const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';

/**
 * Builds a PNG data URL from a raw base64 avatar payload.
 *
 * @param raw Base64-encoded PNG body without a data-URL prefix; blank when unavailable.
 * @returns The `data:image/png;base64,...` URL, or null when the payload is blank.
 */
export function avatarDataUrl(raw: string): string | null {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? `${PNG_DATA_URL_PREFIX}${trimmed}` : null;
}

/**
 * Derives the uppercase leading character used as a no-picture placeholder.
 *
 * @param name Trainee display name.
 * @returns The uppercase first character of the trimmed name, or '?' when blank.
 */
export function nameInitial(name: string): string {
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
}
