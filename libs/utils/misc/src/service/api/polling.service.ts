import { Injectable } from '@angular/core';
import { defer, EMPTY, Observable, repeat, throwError, timer } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

@Injectable()
export class PollingService {
    /**
     * Repeatedly subscribes to the given observable, separating each cycle by the polling period.
     * A failed cycle is retried while attempts remain, each retry waiting a multiple of the period,
     * and the wait returns to a single period once a cycle succeeds. Exhausting the attempts
     * propagates the last error and ends the polling.
     *
     * @param observable$ Observable resubscribed on every cycle.
     * @param pollingPeriod Wait between cycles, in milliseconds.
     * @param retryAttempts Attempts a cycle gets in total, the first one included; the error is
     * propagated once a failure exhausts them, so a value of one leaves no retry.
     * @param initialDelay Set to true to wait one period before the first cycle.
     * @returns Observable emitting the value of every successful cycle.
     */
    public startPolling<Type>(
        observable$: Observable<Type>,
        pollingPeriod: number,
        retryAttempts: number,
        initialDelay?: boolean,
    ): Observable<Type> {
        let retryAttempt = 1;

        const polled$ = observable$.pipe(
            tap(() => {
                retryAttempt = 1;
            }),
            catchError((err) => {
                retryAttempt++;
                return retryAttempt <= retryAttempts
                    ? EMPTY
                    : throwError(() => err);
            }),
            repeat({ delay: () => timer(pollingPeriod * retryAttempt) }),
        );

        return initialDelay
            ? defer(() => timer(pollingPeriod)).pipe(switchMap(() => polled$))
            : polled$;
    }
}
