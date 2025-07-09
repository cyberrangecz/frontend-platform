import {HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {tap} from 'rxjs/operators';

/**  Intercepts HTTP requests and logs error responses to console
 * @param req http request
 * @param next next http handler
 */
export function errorLogInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    return next(req).pipe(
        tap(
            (_) => _,
            (err) => {
                if (err instanceof HttpErrorResponse) {
                    console.error(err);
                }
            },
        ),
    );
}

