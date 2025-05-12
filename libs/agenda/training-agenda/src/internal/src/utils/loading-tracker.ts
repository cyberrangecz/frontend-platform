import { BehaviorSubject, defer, finalize, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export class LoadingTracker {
    private requestCountSubject$ = new BehaviorSubject<number>(0);

    public isLoading$ = this.requestCountSubject$.pipe(map((count: number) => count > 0));

    public trackRequest<T>(request: () => Observable<T>): Observable<T> {
        return defer(() => {
            this.requestCountSubject$.next(this.requestCountSubject$.value + 1);
            return request().pipe(finalize(() => this.requestCountSubject$.next(this.requestCountSubject$.value - 1)));
        });
    }
}
