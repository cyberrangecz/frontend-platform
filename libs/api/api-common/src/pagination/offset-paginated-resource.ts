import { OffsetPagination, PaginatedElements, PaginatedResource } from '@sentinel/common/pagination';

/**
 * Class enhancing PaginatedResource with OffsetPagination type
 */
export class OffsetPaginatedResource<T> extends PaginatedResource<T> {
    declare pagination: OffsetPagination;

    constructor(elements: T[], pagination: OffsetPagination) {
        super(elements, pagination);
    }

    static fromPaginatedElements<T>(
        paginatedElements: PaginatedElements<T>,
    ): OffsetPaginatedResource<T> {
        return new OffsetPaginatedResource<T>(
            paginatedElements.elements,
            paginatedElements.pagination as OffsetPagination,
        );
    }
}
