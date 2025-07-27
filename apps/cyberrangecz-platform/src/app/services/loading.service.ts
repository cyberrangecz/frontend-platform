import {Injectable} from '@angular/core';
import {NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router} from '@angular/router';
import {BehaviorSubject, Subject} from 'rxjs';

@Injectable()
/**
 * Emits events if some global loading starts or ends
 */
export class LoadingService {
    private _isLoadingSubject: Subject<boolean> = new BehaviorSubject(false);
    isLoading$ = this._isLoadingSubject.asObservable();

    constructor(private router: Router) {
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationStart) {
                this.set(true);
            } else if (
                event instanceof NavigationEnd ||
                event instanceof NavigationCancel ||
                event instanceof NavigationError
            ) {
                this.set(false);
            }
        });
    }

    set(value: boolean): void {
        this._isLoadingSubject.next(value);
    }
}
