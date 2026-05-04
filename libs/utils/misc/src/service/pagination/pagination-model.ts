export type PaginationType = 'offset' | 'cursor';

export type SortDir = 'asc' | 'desc';

export interface Pagination {
    numberOfElements: number;
    size: number;
    totalElements: number;
}

export interface OffsetPagination extends Pagination {
    page: number;
    totalPages: number;
}

export interface CursorPagination extends Pagination {
    curr: string | null;
    next: string | null;
    previous: string | null;
}

export interface SortEvent<Sort> {
    sort: Sort;
    sortDir: SortDir;
}

export interface PaginationEvent<Sort> extends SortEvent<Sort> {
    size: number;
}

export interface OffsetPaginationEvent<Sort> extends PaginationEvent<Sort> {
    page: number;
}

export interface CursorPaginationEvent<Sort> extends PaginationEvent<Sort> {
    cursor: string | null;
}

export interface PaginatedElements<Element> {
    elements: Element[];
    pagination: Pagination;
}

export interface PaginationBase<Sort> {
    size: number;
    sort: Sort;
    sortDir: SortDir;
}

export class PaginatedResource<T> implements PaginatedElements<T> {
    constructor(public elements: T[], public pagination: Pagination) {}
}
