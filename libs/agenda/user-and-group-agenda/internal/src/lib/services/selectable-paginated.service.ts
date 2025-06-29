import { OffsetPaginatedElementsService } from '@sentinel/common';
import { BehaviorSubject, Observable } from 'rxjs';

export abstract class SelectablePaginatedService<T> extends OffsetPaginatedElementsService<T> {
    protected constructor(pageSize: number) {
        super(pageSize);
    }

    protected selectedSubject$: BehaviorSubject<T[]> = new BehaviorSubject([]);
    selected$: Observable<T[]> = this.selectedSubject$.asObservable();

    setSelection(selection: T[]): void {
        this.selectedSubject$.next(selection);
    }

    clearSelection(): void {
        this.selectedSubject$.next([]);
    }
}
