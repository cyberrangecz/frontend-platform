import { computed, Injectable, OnDestroy, signal } from '@angular/core';

@Injectable()
export class TimeInterpolationService implements OnDestroy {
    private baseTime = signal<number>(Date.now());
    private timeOffset = signal<number>(0);
    readonly interpolatedTime = computed(
        () => this.baseTime() + this.timeOffset(),
    );

    private timeIntervalMs = 1000;
    private intervalId: number | null = null;

    constructor() {
        this.startTimeProgression();
    }

    /**
     * Updates time progression interval and restarts timer.
     * @param intervalMs - New interval in milliseconds
     */
    public setTimeIntervalMs(intervalMs: number): void {
        this.timeIntervalMs = intervalMs;
        this.stopTimeProgression();
        this.startTimeProgression();
    }

    ngOnDestroy(): void {
        this.stopTimeProgression();
    }

    /**
     * Updates base time and resets offset for new time reference.
     * @param newTime - New base timestamp
     */
    updateBaseTime(newTime: number): void {
        this.baseTime.set(newTime);
        this.timeOffset.set(0);
    }

    /**
     * Starts time progression with current interval.
     */
    private startTimeProgression(): void {
        this.intervalId = window.setInterval(() => {
            this.timeOffset.update((offset) => offset + this.timeIntervalMs);
        }, this.timeIntervalMs);
    }

    /**
     * Stops time progression timer.
     */
    private stopTimeProgression(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
