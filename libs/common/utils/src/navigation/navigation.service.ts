import { inject, Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { ErrorHandlerService } from '../error-handling/error-handler.service';
import { catchError, from, Observable, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private router = inject(Router);
    private errorHandler = inject(ErrorHandlerService);

    public get navigationErrors$() {
        return this.errorHandler.navigationError$;
    }

    public navigate(
        commands: any[],
        extras?: NavigationExtras
    ): Observable<boolean> {
        const url = this.router.serializeUrl(
            this.router.createUrlTree(commands, extras)
        );

        return from(this.router.navigate(commands, extras)).pipe(
            switchMap((result: boolean) => {
                if (!result) {
                    return this.errorHandler
                        .emitNavigationError(
                            new Error(`Navigation cancelled for: ${url}`),
                            `Navigation to ${url} was cancelled`
                        )
                        .pipe(map(() => false));
                }
                return of(true);
            }),
            catchError((error) => {
                return this.errorHandler
                    .emitNavigationError(error, url)
                    .pipe(map(() => false));
            })
        );
    }

    public navigateByUrl(
        url: string,
        extras?: NavigationExtras
    ): Observable<boolean> {
        return this.navigate([url], extras);
    }
}
