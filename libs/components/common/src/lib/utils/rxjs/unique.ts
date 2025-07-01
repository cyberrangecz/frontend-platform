import { OperatorFunction } from 'rxjs';
import { operate } from 'rxjs/internal/util/lift';
import { createOperatorSubscriber } from 'rxjs/internal/operators/OperatorSubscriber';

export function unique<T>(comparator: (a: T, b: T) => boolean): OperatorFunction<T, T> {
    return operate((source, subscriber) => {
        let previousValue: T | undefined = undefined;

        source.subscribe(
            createOperatorSubscriber(
                subscriber,
                (value) => {
                    if (previousValue === undefined || !comparator(previousValue, value)) {
                        subscriber.next(value);
                        previousValue = value;
                    }
                },
                () => {
                    subscriber.complete();
                },
            ),
        );

        return () => {
            previousValue = undefined;
        };
    });
}
