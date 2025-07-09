import { duration } from 'moment-mini';

export class DateUtils {
    /**
     * Prints the first non-zero time unit
     *
     * @param startTime
     * @param endTime
     * @return duration in months / days / hours / minutes
     * if total duration is negative, 'N/A' is returned, if zero, '0 s' is returned
     */
    static timeBetweenDatesSimple(startTime: Date, endTime: Date): string {
        const seconds = Math.floor(
            (endTime.getTime() - startTime.getTime()) / 1000
        );
        return this.formatDurationSimple(seconds);
    }

    /**
     * Prints all non-zero time units
     *
     * @param startTime
     * @param endTime
     * @return duration in format 'xx m xx d xx min xx s', omitting any zero values
     * if total duration is negative, 'N/A' is returned, if zero, '0 s' is returned
     */
    static timeBetweenDatesFull(startTime: Date, endTime: Date): string {
        const seconds = Math.floor(
            (endTime.getTime() - startTime.getTime()) / 1000
        );
        return this.formatDurationFull(seconds);
    }

    public static formatDurationSimple(durationSec: number): string {
        if (durationSec < 0) {
            return 'N/A';
        }
        const momentTime = duration(durationSec, 'seconds');
        if (momentTime.months() > 0) {
            return this.addPluralIfNeeded(momentTime.months(), 'month');
        }
        if (momentTime.days() > 0) {
            return this.addPluralIfNeeded(momentTime.days(), 'day');
        }
        if (momentTime.hours() > 0) {
            return this.addPluralIfNeeded(momentTime.hours(), 'hour');
        }
        if (momentTime.minutes() > 0) {
            return this.addPluralIfNeeded(momentTime.minutes(), 'minute');
        }
        if (momentTime.seconds() > 0) {
            return this.addPluralIfNeeded(momentTime.seconds(), 'second');
        }
        return 'N/A';
    }

    private static addPluralIfNeeded(value: number, unit: string): string {
        return value > 1 ? `${value} ${unit}s` : `${value} ${unit}`;
    }

    /**
     * Prints all non-zero time units
     *
     * @param durationSec duration in seconds
     * @return duration in format 'xx m xx d xx min xx s', omitting any zero values
     * if total duration is negative, N/A is returned
     */
    public static formatDurationFull(durationSec: number): string {
        if (durationSec < 0) {
            return 'N/A';
        }
        const momentTime = duration(durationSec, 'seconds');
        const months =
            momentTime.months() > 0 ? momentTime.months() + ' m ' : '';
        const days = momentTime.days() > 0 ? momentTime.days() + ' d ' : '';
        const hours = momentTime.hours() > 0 ? momentTime.hours() + ' h ' : '';
        const minutes =
            momentTime.minutes() > 0 ? momentTime.minutes() + ' min' : '';
        const seconds =
            momentTime.seconds() > 0 ? momentTime.seconds() + ' s' : '';
        const total = months + days + hours + minutes + seconds;
        return total.length === 0 ? '0 s' : total.trim();
    }
}
