import { Injectable } from '@angular/core';
import { delayWhen, EMPTY, Observable, repeat, throwError, timer } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class PollingService {
    /**
     * Start polling strategy on given observable with given period and maximal retry attempts on fail.
     * Retry attempts are reset on success if there was an error in previous attempt.
     * @param observable$ observable for which the polling is created
     * @param pollingPeriod polling period
     * @param retryAttempts retry attempts on fail
     * @param initialDelay set to true if initial delay of length set in polling period should happen before first call
     */
    public startPolling<Type>(
        observable$: Observable<Type>,
        pollingPeriod: number,
        retryAttempts: number,
        initialDelay?: boolean
    ): Observable<Type> {
        let retryAttempt = 1;

        return observable$.pipe(
            tap(() => {
                // reset retry on successful request if it was previously increased (this resets polling delay as well)
                if (retryAttempt > 1) {
                    retryAttempt = 1;
                }
            }),
            catchError((err) => {
                // on 4xx or 5xx backend response increase attempts
                retryAttempt++;
                if (retryAttempt <= retryAttempts) {
                    return EMPTY; // catch error to allow additional attempt
                } else {
                    return throwError(() => err);
                }
            }),
            // increase delay exponentially on error
            delayWhen(() =>
                initialDelay ? timer(pollingPeriod * retryAttempt) : timer(0)
            ),
            repeat()
        );
    }
}
