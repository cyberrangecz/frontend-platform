import { HttpErrorResponse } from '@angular/common/http';
import { catchError, OperatorFunction, throwError } from 'rxjs';

const BUDGET_EXCEEDED_STATUS = 413;

const BUDGET_EXCEEDED_TEXT = 'The files of this training definition take more than its materials budget allows. Remove a file and save again.';

/**
 * Gives a save rejected for exceeding the materials budget (413) a message naming the cause: the
 * server's message when its body has one, a fixed text otherwise. Every other failure passes
 * through unchanged. The error stays an HttpErrorResponse, so existing error handlers show it
 * unchanged.
 */
export function withAttachmentSaveMessages<T>(): OperatorFunction<T, T> {
    return catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== BUDGET_EXCEEDED_STATUS) {
            return throwError(() => error);
        }
        const body = typeof error.error === 'object' && error.error !== null ? error.error : {};
        const stated = body.message;
        return throwError(
            () =>
                new HttpErrorResponse({
                    error: { ...body, message: typeof stated === 'string' && stated.length > 0 ? stated : BUDGET_EXCEEDED_TEXT },
                    headers: error.headers,
                    status: error.status,
                    statusText: error.statusText,
                    url: error.url ?? undefined,
                }),
        );
    });
}
