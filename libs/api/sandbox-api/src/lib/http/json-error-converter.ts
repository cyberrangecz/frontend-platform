import { HttpErrorResponse } from '@angular/common/http';
import { NEVER, Observable, Subject, throwError } from 'rxjs';

/**
 * Util class to parse blob HttpErrorResponse to json (workaround for https://github.com/angular/angular/issues/19888)
 */
export class JSONErrorConverter {
    static handleError(err: HttpErrorResponse): Observable<never> {
        const newError = { ...err, url: err.url || undefined };

        if ('application/json' === err.headers.get('Content-Type')) {
            const reader = new FileReader();
            reader.addEventListener('loadend', (e) => {
                return JSONErrorConverter.fromText(e);
            });
            return NEVER;
        } else {
            return throwError(new HttpErrorResponse(newError));
        }
    }

    static fromText(err: any): Observable<never> {
        const newError = { ...err };
        newError.error = JSON.parse(err.error);
        return throwError(new HttpErrorResponse(newError));
    }
}
