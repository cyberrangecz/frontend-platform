const MILLISECONDS_PER_UNIT = {
    ms: 1,
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

const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/;
const BYTE_SIZE_PATTERN = /^(\d+)\s*(b|kb|mb|gb)$/i;

/**
 * Human-readable legend of the duration units accepted by {@link parseDurationToMs}, suitable for
 * appending to a validation message.
 */
export const DURATION_UNITS_LEGEND =
    'Units: ms (milliseconds), s (seconds), m (minutes), h (hours), d (days), or "forever".';

/**
 * Human-readable legend of the byte-size units accepted by {@link parseByteSizeToBytes}, suitable
 * for appending to a validation message.
 */
export const BYTE_SIZE_UNITS_LEGEND = 'Units: B, KB, MB, GB (binary, 1024-based).';

/**
 * A cache time-to-live expressed as a magnitude with a unit suffix, or the sentinel `'forever'`.
 *
 * Supported units:
 * - `ms` — milliseconds
 * - `s` — seconds
 * - `m` — minutes (never months; no month or year unit exists here)
 * - `h` — hours
 * - `d` — days
 */
export type CacheTTL =
    | `${number}ms`
    | `${number}s`
    | `${number}m`
    | `${number}h`
    | `${number}d`
    | 'forever';

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
 * Builds a duration predicate that holds when a value is at least a minimum duration, for
 * composing after {@link isNumberWithDurationUnit} in a validation chain. A value equal to the
 * minimum passes; a value below it fails. Inputs that are not well-formed durations pass
 * unchallenged, leaving {@link isNumberWithDurationUnit} the sole reporter of format errors.
 *
 * @param minimumDuration Inclusive lower bound as a duration string such as `'1s'`; `'forever'`
 * and every value at or above the bound satisfy the predicate.
 * @returns A predicate reporting whether a duration string meets the minimum.
 */
export function isDurationAtLeast(
    minimumDuration: string,
): (value: string) => boolean {
    const minimumMs = parseDurationToMs(minimumDuration);
    return (value: string): boolean =>
        !isNumberWithDurationUnit(value) ||
        parseDurationToMs(value) >= minimumMs;
}

/**
 * Converts a validated duration string into milliseconds. Call {@link isNumberWithDurationUnit}
 * first; an unvalidated malformed input is a programming error.
 *
 * @param value Duration string such as `'300ms'`, `'30s'`, `'8h'`, `'1_000m'`, or `'forever'`.
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
 * Builds a byte-size predicate that holds when a value is at least a minimum size, for composing
 * after {@link isNumberWithByteSizeUnit} in a validation chain. A value equal to the minimum
 * passes; a value below it fails. Inputs that are not well-formed byte sizes pass unchallenged,
 * leaving {@link isNumberWithByteSizeUnit} the sole reporter of format errors.
 *
 * @param minimumByteSize Inclusive lower bound as a byte-size string such as `'30MB'`; every value
 * at or above the bound satisfies the predicate.
 * @returns A predicate reporting whether a byte-size string meets the minimum.
 */
export function isByteSizeAtLeast(
    minimumByteSize: string,
): (value: string) => boolean {
    const minimumBytes = parseByteSizeToBytes(minimumByteSize);
    return (value: string): boolean =>
        !isNumberWithByteSizeUnit(value) ||
        parseByteSizeToBytes(value) >= minimumBytes;
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
