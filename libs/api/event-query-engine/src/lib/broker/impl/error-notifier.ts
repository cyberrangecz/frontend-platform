import { ignoreElements, Observable, switchMap, throwError } from 'rxjs';
import { ErrorHandlerService } from '@crczp/utils';

/**
 * Logs an error, emits a user-facing notification, then rethrows so the source stream terminates.
 * Used by the one-shot query path, where an error must surface to the caller.
 *
 * @param err The error to report; non-Error values are stringified for the notification message.
 * @param errorHandler Service that surfaces the user-facing notification.
 * @returns An Observable that emits the notification and then errors with the original error.
 */
export function notifyError(err: unknown, errorHandler: ErrorHandlerService): Observable<never> {
    const message = err instanceof Error ? err.message : String(err);
    console.error(err);
    return errorHandler.emitFrontendErrorNotification(message).pipe(
        switchMap(() => throwError(() => err)),
    );
}

/**
 * Logs an error and emits a user-facing notification without rethrowing, so the calling stream
 * survives the failure. Used by the resilient sync-driver loop, where a transient outage must not
 * tear down polling for every reader.
 *
 * @param err The error to report; non-Error values are stringified for the notification message.
 * @param errorHandler Service that surfaces the user-facing notification.
 * @returns An Observable that emits the notification as a side effect and then completes without
 * producing any value.
 */
export function notifyOutage(err: unknown, errorHandler: ErrorHandlerService): Observable<never> {
    const message = err instanceof Error ? err.message : String(err);
    console.error(err);
    return errorHandler.emitFrontendErrorNotification(message).pipe(ignoreElements());
}
