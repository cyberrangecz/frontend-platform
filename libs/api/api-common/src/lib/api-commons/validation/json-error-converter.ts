import {HttpErrorResponse} from '@angular/common/http';
import {catchError, from, map, OperatorFunction, throwError} from 'rxjs';

/**
 * Util class to parse blob HttpErrorResponse to json (workaround for https://github.com/angular/angular/issues/19888)
 */
export function handleJsonError<T>(): OperatorFunction<T, T> {
    return catchError((err: HttpErrorResponse) => {
        if (err.error instanceof Blob) {
            return from(err.error.text()).pipe(
                map(text => {
                    const json = JSON.parse(text);
                    throw new HttpErrorResponse({
                        error: json,
                        headers: err.headers,
                        status: err.status,
                        statusText: err.statusText,
                        url: err.url ?? undefined
                    });
                })
            );
        } else if (typeof err.error === 'string') {
            return throwError(() => new HttpErrorResponse({ ...err, error: JSON.parse(err.error) }));
        }
        return throwError(new HttpErrorResponse(err));
    });
}
