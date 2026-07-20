import { intervalToDuration } from 'date-fns';

/**
 * Formats a millisecond offset as a clock duration (`m:ss`, or `h:mm:ss` past an hour).
 *
 * @param offsetMs Milliseconds elapsed from a reference instant; negative values clamp to zero.
 * @returns The duration string in `m:ss` form, widening to `h:mm:ss` once an hour is reached.
 */
export function formatClock(offsetMs: number): string {
    const totalSeconds = Math.max(0, Math.round(offsetMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedSeconds = String(seconds).padStart(2, '0');
    if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
    return `${minutes}:${paddedSeconds}`;
}

/**
 * Formats a millisecond offset as a unit-labelled duration split across up to two
 * lines: years, months, days, and hours on the first line, minutes and seconds on
 * the second, each omitting its zero units. Collapses to a single line when one
 * group is empty, and to `0 s` when the offset is zero or negative.
 *
 * @param offsetMs Milliseconds elapsed from a reference instant; negative values clamp to zero.
 * @returns The duration string, with a newline between the two unit groups when both are present.
 */
export function formatZoomDuration(offsetMs: number): string {
    const parts = intervalToDuration({ start: 0, end: Math.max(0, Math.round(offsetMs)) });
    const high = [
        parts.years ? `${parts.years} y` : '',
        parts.months ? `${parts.months} m` : '',
        parts.days ? `${parts.days} d` : '',
        parts.hours ? `${parts.hours} h` : '',
    ]
        .filter(Boolean)
        .join(' ');
    const low = [
        parts.minutes ? `${parts.minutes} min` : '',
        parts.seconds ? `${parts.seconds} s` : '',
    ]
        .filter(Boolean)
        .join(' ');
    if (!high && !low) return '0 s';
    return high && low ? `${high}\n${low}` : high || low;
}
