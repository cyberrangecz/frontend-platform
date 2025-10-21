import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    CrczpOffsetElementsPaginatedService,
    OffsetPaginatedResource,
} from '@crczp/api-common';

export abstract class SelectablePaginatedService<
    T,
> extends CrczpOffsetElementsPaginatedService<T> {
    override resource$ = this.resourceSubject$
        .asObservable()
        .pipe(
            map((elements) =>
                OffsetPaginatedResource.fromPaginatedElements(elements),
            ),
        );
    protected selectedSubject$: BehaviorSubject<T[]> = new BehaviorSubject([]);
    selected$: Observable<T[]> = this.selectedSubject$.asObservable();

    protected constructor(pageSize: number) {
        super(pageSize);
    }

    setSelection(selection: T[]): void {
        this.selectedSubject$.next(selection);
    }

    clearSelection(): void {
        this.selectedSubject$.next([]);
    }
}
