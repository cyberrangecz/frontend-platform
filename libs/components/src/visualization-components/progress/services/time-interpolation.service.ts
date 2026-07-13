import { computed, Injectable, OnDestroy, Signal, signal } from '@angular/core';

/**
 * Component-scoped clock that interpolates a monotonically increasing
 * timestamp between server-anchored base time updates.
 *
 * Anchor with `updateBaseTime` on every fresh server timestamp; between
 * anchors the `interpolatedTime` signal advances locally at a fixed
 * cadence.
 */
@Injectable()
export class TimeInterpolationService implements OnDestroy {
    /**
     * Cadence at which the local interpolated offset advances, in
     * milliseconds.
     */
    private static readonly TICK_INTERVAL_MS = 1000;

    private readonly baseTime = signal<number>(Date.now());
    private readonly timeOffset = signal<number>(0);

    /**
     * Live interpolated timestamp in milliseconds since the Unix epoch.
     */
    public readonly interpolatedTime: Signal<number> = computed(
        () => this.baseTime() + this.timeOffset(),
    );

    private intervalId: number | null = null;

    constructor() {
        this.startTimeProgression();
    }

    public ngOnDestroy(): void {
        this.stopTimeProgression();
    }

    /**
     * Re-anchors the clock to a fresh server timestamp and resets the
     * local interpolation offset to zero.
     *
     * @param newTime - New base timestamp in milliseconds since the Unix
     *                  epoch.
     */
    public updateBaseTime(newTime: number): void {
        this.baseTime.set(newTime);
        this.timeOffset.set(0);
    }

    private startTimeProgression(): void {
        this.intervalId = window.setInterval(() => {
            this.timeOffset.update(
                (offset) => offset + TimeInterpolationService.TICK_INTERVAL_MS,
            );
        }, TimeInterpolationService.TICK_INTERVAL_MS);
    }

    private stopTimeProgression(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
