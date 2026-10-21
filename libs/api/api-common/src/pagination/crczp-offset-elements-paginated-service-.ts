import { map } from 'rxjs';
import { OffsetPaginatedResource } from './offset-paginated-resource';
import { OffsetPaginatedElementsService } from '@sentinel/common';
import { MAX_PAGE_SIZE } from '@crczp/utils';

export class CrczpOffsetElementsPaginatedService<
    T,
> extends OffsetPaginatedElementsService<T> {
    override resource$ = this.resourceSubject$
        .asObservable()
        .pipe(
            map((elements) =>
                OffsetPaginatedResource.fromPaginatedElements(elements),
            ),
        );

    /** Starts the resource at the given page size, never above `MAX_PAGE_SIZE`. */
    protected override initSubject(pageSize: number) {
        return super.initSubject(Math.min(pageSize, MAX_PAGE_SIZE));
    }
}
