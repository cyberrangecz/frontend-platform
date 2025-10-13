import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';

/**  Intercepts HTTP requests and logs error responses to console
 * @param req http request
 * @param next next http handler
 */
export function errorLogInterceptor(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
    const errorHandler = inject(ErrorHandlerService);
    return next(req).pipe(
        tap(
            (_) => _,
            (err) => {
                if (err instanceof HttpErrorResponse) {
                    console.error(err);
                    errorHandler.emitAPIError(err, 'Error handling request');
                }
            }
        )
    );
}
