import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { SKIPPED_ERROR_CODES } from '@crczp/api-common';


/**  Intercepts HTTP requests and logs error responses to console
 * @param req http request
 * @param next next http handler
 */
export function errorLogInterceptor(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
    const errorHandler = inject(ErrorHandlerService);
    return next(req).pipe(
        tap(
            (_) => _,
            (err) => {
                if (err instanceof HttpErrorResponse && err.status >= 400) {
                    if (
                        !req.context
                            .get(SKIPPED_ERROR_CODES)
                            .includes(err.status)
                    ) {
                        let codeBasedMessage = 'Error occurred while processing a request.';
                        switch (err.status) {
                            case 0:
                                codeBasedMessage = 'Network error.';
                                break;
                            case 401:
                                codeBasedMessage = 'Unauthorized access. Please log in.';
                                break;
                            case 403:
                                codeBasedMessage = 'Insufficient permissions.';
                                break;
                            case 404:
                                codeBasedMessage = 'Resource not found.';
                                break;
                            case 500:
                                codeBasedMessage = 'Internal server error.';
                                break;
                        }

                        errorHandler.emitAPIError(
                            err,
                            codeBasedMessage,
                        );
                    } else if (err.status >= 400) {
                        console.warn("Allowed error occurred:", err);
                    }
                }
            },
        ),
    );
}
