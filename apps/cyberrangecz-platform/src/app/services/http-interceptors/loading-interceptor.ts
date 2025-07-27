import {
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
    HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { LoadingService } from '../loading.service';

/**
 * Intercepts http requests and displays loading while at least one http request is waiting on a response
 */

const requests: HttpRequest<any>[] = [];

export function loadingInterceptor(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
    const loadingService = inject(LoadingService);

    requests.push(req);
    loadingService.set(true);
    return new Observable((observer: Subscriber<HttpEvent<any>>) => {
        const subscription = next(req).subscribe(
            (event) => {
                if (event instanceof HttpResponse) {
                    removeRequest(req, loadingService);
                    observer.next(event);
                }
            },
            (err) => {
                removeRequest(req, loadingService);
                observer.error(err);
            },
            () => {
                removeRequest(req, loadingService);
                observer.complete();
            }
        );
        return () => {
            removeRequest(req, loadingService);
            subscription.unsubscribe();
        };
    });
}

function removeRequest(req: HttpRequest<any>, loadingService: LoadingService) {
    const i = requests.indexOf(req);
    if (i >= 0) {
        requests.splice(i, 1);
    }
    loadingService.set(requests.length > 0);
}
