import { intervalToDuration } from 'date-fns';

/**
 * Prints the first non-zero time unit
 *
 * @param startTime
 * @param endTime
 * @return duration in months / days / hours / minutes
 * if total duration is negative, 'N/A' is returned, if zero, '0 s' is returned
 */
function timeBetweenDatesSimple(startTime: Date, endTime: Date): string {
    const seconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000,
    );
    return formatDurationSimple(seconds);
}

/**
 * Prints all non-zero time units
 *
 * @param startTime
 * @param endTime
 * @return duration in format 'xx m xx d xx min xx s', omitting any zero values
 * if total duration is negative, 'N/A' is returned, if zero, '0 s' is returned
 */
function timeBetweenDatesFull(startTime: Date, endTime: Date): string {
    const seconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000,
    );
    return formatDurationFull(seconds);
}

function addPluralIfNeeded(value: number, unit: string): string {
    return value > 1 ? `${value} ${unit}s` : `${value} ${unit}`;
}

function formatDurationSimple(durationSec: number): string {
    if (durationSec < 0) {
        return 'N/A';
    }
    const {
        years = 0,
        months = 0,
        days = 0,
        hours = 0,
        minutes = 0,
        seconds = 0,
    } = intervalToDuration({ start: 0, end: durationSec * 1000 });
    const totalMonths = years * 12 + months;
    if (totalMonths > 0) {
        return addPluralIfNeeded(totalMonths, 'month');
    }
    if (days > 0) {
        return addPluralIfNeeded(days, 'day');
    }
    if (hours > 0) {
        return addPluralIfNeeded(hours, 'hour');
    }
    if (minutes > 0) {
        return addPluralIfNeeded(minutes, 'minute');
    }
    if (seconds > 0) {
        return addPluralIfNeeded(seconds, 'second');
    }
    return 'N/A';
}

/**
 * Prints all non-zero time units
 *
 * @param durationSec duration in seconds
 * @return duration in format 'xx m xx d xx min xx s', omitting any zero values
 * if total duration is negative, N/A is returned
 */
function formatDurationFull(durationSec: number): string {
    if (durationSec < 0) {
        return 'N/A';
    }
    const {
        years = 0,
        months = 0,
        days = 0,
        hours = 0,
        minutes = 0,
        seconds = 0,
    } = intervalToDuration({ start: 0, end: durationSec * 1000 });
    const totalMonths = years * 12 + months;
    const monthsPart = totalMonths > 0 ? totalMonths + ' m ' : '';
    const daysPart = days > 0 ? days + ' d ' : '';
    const hoursPart = hours > 0 ? hours + ' h ' : '';
    const minutesPart = minutes > 0 ? minutes + ' min' : '';
    const secondsPart = seconds > 0 ? seconds + ' s' : '';
    const total = monthsPart + daysPart + hoursPart + minutesPart + secondsPart;
    return total.length === 0 ? '0 s' : total.trim();
}

export const DateUtils = {
    formatDurationFull,
    formatDurationSimple,
    timeBetweenDatesSimple,
    timeBetweenDatesFull,
};
