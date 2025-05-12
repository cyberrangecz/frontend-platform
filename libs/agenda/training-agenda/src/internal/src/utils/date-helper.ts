import * as moment from 'moment';

export class DateHelper {
    static timeBetweenDatesSimple(startTime: Date, endTime: Date): string {
        return this.timeBetweenDatesCalculator(startTime, endTime);
    }

    static timeBetweenDatesFull(startTime: Date, endTime: Date): string {
        const seconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        return this.formatDurationFull(seconds);
    }

    static formatDurationSimple(endTime: Date): string {
        const now = new Date();
        return this.timeBetweenDatesCalculator(now, endTime);
    }

    private static timeBetweenDatesCalculator(startTime: Date, endTime: Date): string {
        const miliseconds = endTime.getTime() - startTime.getTime();
        const seconds = Math.floor(miliseconds / 1000);
        const minutes = Math.floor(miliseconds / (1000 * 60));
        const hours = Math.floor(miliseconds / (1000 * 60 * 60));
        const days = Math.floor(miliseconds / (1000 * 60 * 60 * 24));

        if (days > 0) {
            return days > 1 ? `${days} days` : `${days} day`;
        }
        if (hours > 0) {
            return hours > 1 ? `${hours} hours` : `${hours} hour`;
        }
        if (minutes > 0) {
            return minutes > 1 ? `${minutes} minutes` : `${minutes} minute`;
        }
        if (seconds > 0) {
            return seconds > 1 ? `${seconds} seconds` : `${seconds} second`;
        }
        return '';
    }

    /**
     *
     * @param estimatedDurationSec duration in seconds
     * @return duration in format 'xx m xx d xx min xx s', omitting any zero values
     * if total duration is zero, N/A is returned
     */
    static formatDurationFull(estimatedDurationSec: number): string {
        const momentTime = moment.duration(estimatedDurationSec, 'seconds');
        const months = momentTime.months() > 0 ? momentTime.months() + ' m ' : '';
        const days = momentTime.days() > 0 ? momentTime.days() + ' d ' : '';
        const hours = momentTime.hours() > 0 ? momentTime.hours() + ' h ' : '';
        const minutes = momentTime.minutes() > 0 ? momentTime.minutes() + ' min' : '';
        const total = months + days + hours + minutes;
        return total.length === 0 ? 'N/A' : total.trim();
    }
}
