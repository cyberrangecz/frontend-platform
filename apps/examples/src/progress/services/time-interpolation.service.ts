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

    public setTimeIntervalMs(intervalMs: number): void {
        this.timeIntervalMs = intervalMs;
        this.stopTimeProgression();
        this.startTimeProgression();
    }

    ngOnDestroy(): void {
        this.stopTimeProgression();
    }

    updateBaseTime(newTime: number): void {
        this.baseTime.set(newTime);
        this.timeOffset.set(0);
    }

    private startTimeProgression(): void {
        this.intervalId = window.setInterval(() => {
            this.timeOffset.update((offset) => offset + this.timeIntervalMs);
        }, this.timeIntervalMs);
    }

    private stopTimeProgression(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
