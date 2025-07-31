import { inject, Injectable } from '@angular/core';
import {
    NavigationCancel,
    NavigationEnd,
    NavigationError,
    NavigationStart,
    Router,
} from '@angular/router';
import {
    asyncScheduler,
    BehaviorSubject,
    combineLatest,
    map,
    observeOn,
} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
    private apiLoading$ = new BehaviorSubject<boolean>(false);
    private navigationLoading$ = new BehaviorSubject<boolean>(false);

    isLoading$ = combineLatest([
        this.apiLoading$,
        this.navigationLoading$,
    ]).pipe(
        map(([api, nav]) => api || nav),
        observeOn(asyncScheduler) // Ensure async emission, to avoid NG0100
    );

    private readonly router = inject(Router);

    constructor() {
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationStart) {
                this.navigationLoading$.next(true);
            } else if (
                event instanceof NavigationEnd ||
                event instanceof NavigationCancel ||
                event instanceof NavigationError
            ) {
                this.navigationLoading$.next(false);
            }
        });
    }

    /** Called by API services to indicate loading state */
    set(value: boolean): void {
        this.apiLoading$.next(value);
    }
}
