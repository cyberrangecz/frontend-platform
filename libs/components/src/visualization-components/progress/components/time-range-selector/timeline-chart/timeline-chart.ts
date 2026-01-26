import { Component, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TimelineItem {
    value: number;
    label: string;
}

@Component({
    selector: 'crczp-timeline-chart',
    imports: [CommonModule],
    templateUrl: './timeline-chart.html',
    styleUrl: './timeline-chart.scss',
})
export class TimelineChart {
    /** Maximum possible value of a breakpoint */
    readonly scale = input.required<number>();
    /** List of timeline breakpoints, dividing the timeline into intervals */
    readonly breakpoints = input.required<TimelineItem[]>();
    readonly currentIndex = model.required<number>();

    /**
     * Selects time interval by index.
     * @param index - Index of interval to select
     */
    selectInterval(index: number): void {
        const reversedIndex = this.breakpoints().length - 2 - index;
        this.currentIndex.set(reversedIndex);
    }

    /**
     * Converts value to percentage of total scale.
     * @param value - Value to convert
     * @returns Percentage of total scale
     */
    getPercentage(value: number): number {
        const max = this.scale();
        return max > 0 ? (value / max) * 100 : 0;
    }
}
