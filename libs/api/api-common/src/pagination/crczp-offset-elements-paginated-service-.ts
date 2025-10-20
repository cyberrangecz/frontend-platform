import { map } from 'rxjs';
import { OffsetPaginatedResource } from './offset-paginated-resource';
import { OffsetPaginatedElementsService } from '@sentinel/common';

export class CrczpOffsetElementsPaginatedService<
    T,
> extends OffsetPaginatedElementsService<T> {
    resource$ = this.resourceSubject$
        .asObservable()
        .pipe(
            map((elements) =>
                OffsetPaginatedResource.fromPaginatedElements(elements),
            ),
        );
}
