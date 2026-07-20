const MILLISECONDS_PER_UNIT = {
    s: 1_000,
    m: 60 * 1_000,
    h: 60 * 60 * 1_000,
    d: 24 * 60 * 60 * 1_000,
} as const;

const BYTES_PER_UNIT = {
    b: 1,
    kb: 1_024,
    mb: 1_024 ** 2,
    gb: 1_024 ** 3,
} as const;

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;
const BYTE_SIZE_PATTERN = /^(\d+)\s*(b|kb|mb|gb)$/i;

/**
 * Human-readable legend of the duration units accepted by {@link parseDurationToMs}, suitable for
 * appending to a validation message.
 */
export const DURATION_UNITS_LEGEND =
    'Units: s (seconds), m (minutes), h (hours), d (days), or "forever".';

/**
 * Human-readable legend of the byte-size units accepted by {@link parseByteSizeToBytes}, suitable
 * for appending to a validation message.
 */
export const BYTE_SIZE_UNITS_LEGEND = 'Units: B, KB, MB, GB (binary, 1024-based).';

/**
 * A cache time-to-live expressed as a magnitude with a unit suffix, or the sentinel `'forever'`.
 *
 * Supported units:
 * - `s` — seconds
 * - `m` — minutes (never months; no month or year unit exists here)
 * - `h` — hours
 * - `d` — days
 */
export type CacheTTL = `${number}s` | `${number}m` | `${number}h` | `${number}d` | 'forever';

/**
 * Removes underscore digit separators so grouped numbers such as `500_000` read as one value.
 *
 * @param value Raw unit string that may contain underscores.
 * @returns The string trimmed of surrounding whitespace and stripped of underscores.
 */
function normalize(value: string): string {
    return value.trim().replace(/_/g, '');
}

/**
 * Reports whether a string is a duration accepted by {@link parseDurationToMs} — a magnitude with
 * an `s`/`m`/`h`/`d` suffix, or `'forever'`. Underscore digit separators are permitted.
 *
 * @param value Candidate duration string.
 * @returns `true` when the string is a well-formed duration.
 */
export function isNumberWithDurationUnit(value: string): boolean {
    const normalized = normalize(value);
    return normalized === 'forever' || DURATION_PATTERN.test(normalized);
}

/**
 * Reports whether a string is a byte size accepted by {@link parseByteSizeToBytes} — a magnitude
 * with a `B`/`KB`/`MB`/`GB` suffix, case-insensitively. Underscore digit separators are permitted.
 *
 * @param value Candidate byte-size string.
 * @returns `true` when the string is a well-formed byte size.
 */
export function isNumberWithByteSizeUnit(value: string): boolean {
    return BYTE_SIZE_PATTERN.test(normalize(value));
}

/**
 * Converts a validated duration string into milliseconds. Call {@link isNumberWithDurationUnit}
 * first; an unvalidated malformed input is a programming error.
 *
 * @param value Duration string such as `'30s'`, `'8h'`, `'7d'`, `'1_000m'`, or `'forever'`.
 * @returns The duration in milliseconds; `Number.MAX_SAFE_INTEGER` for `'forever'`.
 * @throws {Error} When the string is not a well-formed duration.
 */
export function parseDurationToMs(value: string): number {
    const normalized = normalize(value);
    if (normalized === 'forever') {
        return Number.MAX_SAFE_INTEGER;
    }
    const match = DURATION_PATTERN.exec(normalized);
    if (!match) {
        throw new Error(`Invalid duration format: ${value}`);
    }
    const unit = match[2] as keyof typeof MILLISECONDS_PER_UNIT;
    return Number(match[1]) * MILLISECONDS_PER_UNIT[unit];
}

/**
 * Converts a validated byte-size string into a number of bytes using binary (1024-based)
 * multipliers. Call {@link isNumberWithByteSizeUnit} first; an unvalidated malformed input is a
 * programming error.
 *
 * @param value Byte-size string such as `'500MB'`, `'2GB'`, or `'524_288_000B'`.
 * @returns The size in bytes.
 * @throws {Error} When the string is not a well-formed byte size.
 */
export function parseByteSizeToBytes(value: string): number {
    const match = BYTE_SIZE_PATTERN.exec(normalize(value));
    if (!match) {
        throw new Error(`Invalid byte size format: ${value}`);
    }
    const unit = match[2].toLowerCase() as keyof typeof BYTES_PER_UNIT;
    return Number(match[1]) * BYTES_PER_UNIT[unit];
}
