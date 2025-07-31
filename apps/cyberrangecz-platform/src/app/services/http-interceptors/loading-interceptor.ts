import { HttpEvent, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
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

    return new Observable((observer: Subscriber<HttpEvent<any>>) => {
        const subscription = next(req).subscribe({
            next: (event) => {
                if (event instanceof HttpResponse) {
                    removeRequest(requestId, loadingService);
                }
                observer.next(event);
            },
            error: (err) => {
                removeRequest(requestId, loadingService);
                observer.error(err);
            },
            complete: () => {
                removeRequest(requestId, loadingService);
                observer.complete();
            },
        });

        return () => {
            removeRequest(requestId, loadingService);
            subscription.unsubscribe();
        };
    });
}

function removeRequest(requestId: string, loadingService: LoadingService) {
    requests.delete(requestId);
    loadingService.set(requests.size > 0);
}
