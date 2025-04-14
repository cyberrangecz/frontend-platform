import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * Util class to parse blob HttpErrorResponse to json (workaround for https://github.com/angular/angular/issues/19888)
 */
export class JSONErrorConverter {
    static fromBlob<T extends { error: unknown }>(err: T): Observable<never> {
        const newError = { ...err };
        if (err.error instanceof Blob) {
            return JSONErrorConverter.readBlobAsJSON(err.error).pipe(
                switchMap((errJSON) => {
                    newError.error = errJSON;
                    return throwError(new HttpErrorResponse(newError));
                }),
            );
        }
        return throwError(new HttpErrorResponse(newError));
    }

    private static readBlobAsJSON(input: Blob): Observable<JSON> {
        const reader = new FileReader();
        reader.readAsText(input);
        return new Observable<JSON>((observer) => {
            reader.onloadend = () => {
                observer.next(JSON.parse(reader.result as string));
                observer.complete();
            };
        });
    }

    static fromText<T extends { error: string }>(err: T): Observable<never> {
        const newError = { ...err };
        newError.error = JSON.parse(err.error);
        return throwError(new HttpErrorResponse(newError));
    }
}
