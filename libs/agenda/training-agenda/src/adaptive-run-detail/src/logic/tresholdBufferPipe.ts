/*
 * Saves values in a buffer until a condition is met.
 * */
import { OperatorFunction } from 'rxjs';
import { operate } from 'rxjs/internal/util/lift';
import { createOperatorSubscriber } from 'rxjs/internal/operators/OperatorSubscriber';

export function thresholdBuffer<T>(valuesOverThreshold: (values: T[]) => boolean): OperatorFunction<T, T[]> {
    return operate((source, subscriber) => {
        let currentBuffer: T[] = [];

        source.subscribe(
            createOperatorSubscriber(
                subscriber,
                (value) => {
                    currentBuffer.push(value);
                    if (valuesOverThreshold(currentBuffer)) {
                        subscriber.next(currentBuffer);
                        currentBuffer = [];
                    }
                },
                () => {
                    if (currentBuffer.length > 0) {
                        subscriber.next(currentBuffer);
                    }
                    subscriber.complete();
                },
            ),
        );

        return () => {
            currentBuffer = [];
        };
    });
}
