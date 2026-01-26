import {
    Component,
    computed,
    effect,
    input,
    model,
    output,
} from '@angular/core';
import { SentinelEnumerationSelectComponent } from '@sentinel/components/enumeration-select';
import moment from 'moment';
import { TimelineChart, TimelineItem } from './timeline-chart/timeline-chart';

export type TimeRangeOption =
    | '30_MINUTES'
    | '1_HOUR'
    | '6_HOURS'
    | '12_HOURS'
    | '24_HOURS'
    | '7_DAYS'
    | 'UNLIMITED';

export type TimeRangeEvent = {
    startTimeMs: number;
    endTimeMs: number;
};

/**
 * Maps time range options to their granularity in milliseconds.
 */
const GRANULARITY_MAP: Record<TimeRangeOption, number | null> = {
    '30_MINUTES': 30 * 60 * 1000,
    '1_HOUR': 60 * 60 * 1000,
    '6_HOURS': 6 * 60 * 60 * 1000,
    '12_HOURS': 12 * 60 * 60 * 1000,
    '24_HOURS': 24 * 60 * 60 * 1000,
    '7_DAYS': 7 * 24 * 60 * 60 * 1000,
    UNLIMITED: null,
};

@Component({
    selector: 'crczp-time-range-selector',
    imports: [SentinelEnumerationSelectComponent, TimelineChart],
    templateUrl: './time-range-selector.html',
    styleUrl: './time-range-selector.scss',
})
export class TimeRangeSelector {
    readonly startTimeMs = input.required<number>();
    readonly endTimeMs = input.required<number>();
    readonly isSameDay = computed(() => {
        const start = moment(this.startTimeMs());
        const end = moment(this.endTimeMs());
        return start.isSame(end, 'day');
    });
    readonly selectedTimeRange = output<TimeRangeEvent>();
    readonly selectedOption = model<TimeRangeOption>('1_HOUR');
    protected timelineIndex = model(0);
    protected readonly timeRangeOptions = computed(() => {
        const start = this.startTimeMs();
        const end = this.endTimeMs();
        const duration = end - start;

        const allOptions: TimeRangeOption[] = [
            '30_MINUTES',
            '1_HOUR',
            '6_HOURS',
            '12_HOURS',
            '24_HOURS',
            '7_DAYS',
            'UNLIMITED',
        ];

        return allOptions.filter((option) => {
            const gran = GRANULARITY_MAP[option];
            if (!gran) return true; // UNLIMITED is always available
            return duration >= gran;
        });
    });

    /**
     * Computes timeline breakpoints based on selected time range option.
     */
    protected readonly breakpoints = computed<TimelineItem[]>(() => {
        const start = this.startTimeMs();
        const end = this.endTimeMs();
        const option = this.selectedOption();
        const gran = GRANULARITY_MAP[option];

        if (!gran) {
            return [
                { value: 0, label: this.formatDate(start) },
                { value: end - start, label: this.formatDate(end) },
            ];
        }

        const timelineBreakpoints: TimelineItem[] = [];
        let currentEnd = end;
        while (currentEnd > start) {
            timelineBreakpoints.push({
                value: currentEnd - start,
                label: this.formatDate(currentEnd),
            });
            const currentStart = Math.max(start, currentEnd - gran);
            // If the calculated start is less than the input start,
            // it means this is the last chunk and it should start at the input start.
            currentEnd = currentStart < start ? start : currentStart;
        }
        timelineBreakpoints.push({
            value: 0,
            label: this.formatDate(start),
        });
        return timelineBreakpoints.reverse();
    });

    /**
     * Initializes component and sets up timeline index effect.
     */
    constructor() {
        effect(() => {
            const inverseIndex =
                this.breakpoints().length - 2 - this.timelineIndex();
            const startTimeMs =
                this.startTimeMs() + this.breakpoints()[inverseIndex].value;
            const endTimeMs =
                this.startTimeMs() + this.breakpoints()[inverseIndex + 1].value;

            console.log({
                start: moment(startTimeMs).format('HH:mm'),
                end: moment(endTimeMs).format('HH:mm'),
                duration: moment(endTimeMs - startTimeMs).format('HH:mm:ss'),
            });
        });
    }

    /**
     * Formats timestamp as time string based on same-day check.
     * @param ms - Timestamp in milliseconds
     * @returns Formatted time string
     */
    private formatDate(ms: number): string {
        const format = this.isSameDay() ? 'HH:mm' : 'MMM D HH:mm';
        return moment(ms).format(format);
    }
}
