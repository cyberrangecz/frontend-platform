import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { isBefore } from 'date-fns';
import { interval, map, startWith, takeWhile } from 'rxjs';

/**
 * Builds a wall-clock signal that ticks on the given cadence and stops once the instance
 * end-time has passed. It emits the current time in milliseconds immediately and on every tick,
 * completing on the first tick at or after the resolved end-time. Ticks fired before the end-time
 * resolves are always emitted.
 *
 * Must be called within an injection context, after any field the accessor reads is initialized.
 *
 * @param tickMs Interval between ticks, in milliseconds.
 * @param instanceEndTime Accessor for the resolved instance end-time, undefined while unresolved.
 * @returns A signal of the current time in milliseconds.
 */
export function createInstanceClock(
    tickMs: number,
    instanceEndTime: () => Date | undefined,
): Signal<number> {
    return toSignal(
        interval(tickMs).pipe(
            startWith(0),
            map(() => Date.now()),
            takeWhile((nowMs) => {
                const endTime = instanceEndTime();
                return endTime === undefined ? true : isBefore(nowMs, endTime);
            }, true),
        ),
        { requireSync: true },
    );
}
