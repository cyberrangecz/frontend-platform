import { Observable, switchMap, throwError } from 'rxjs';
import { ErrorHandlerService } from '@crczp/utils';

export function notifyError(err: unknown, errorHandler: ErrorHandlerService): Observable<never> {
    const message = err instanceof Error ? err.message : String(err);
    console.error(err);
    return errorHandler.emitFrontendErrorNotification(message).pipe(
        switchMap(() => throwError(() => err)),
    );
}
