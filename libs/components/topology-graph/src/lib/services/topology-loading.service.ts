import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';

/**
 * Global loading service. Emits events from library through observable. Client app should subscribe to isLoading$ observable and
 * display app specific loading indicator.
 */
@Injectable()
export class TopologyLoadingService {
    private isLoadingSubject: Subject<boolean> = new ReplaySubject();
    isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();

    setIsLoading(value: boolean) {
        this.isLoadingSubject.next(value);
    }
}
