import { HttpEvent, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { LoadingService } from '../loading.service';

/**
 * Intercepts http requests and displays loading while at least one http request is waiting on a response
 */

const requests = new Set<string>();

export function loadingInterceptor(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
    const loadingService = inject(LoadingService);

    const requestId = `${req.method}-${req.urlWithParams}`;
    requests.add(requestId);
    loadingService.set(true);

    return next(req).pipe(
        tap((event) => {
            if (event instanceof HttpResponse) {
                removeRequest(requestId, loadingService);
            }
        }),
        finalize(() => removeRequest(requestId, loadingService))
    );
}

function removeRequest(requestId: string, loadingService: LoadingService) {
    requests.delete(requestId);
    loadingService.set(requests.size > 0);
}
