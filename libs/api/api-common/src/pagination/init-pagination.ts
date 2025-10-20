import {
    OffsetPaginationEvent,
    PaginatedResource,
    SortDir,
} from '@sentinel/common/pagination';
import { inject } from '@angular/core';
import { PortalConfig } from '@crczp/utils';

export type InitPaginationOptions<Sort> = {
    sort?: Sort;
    sortDir?: SortDir;
    pageSize?: number;
};

/**
 * Create an `OffsetPaginationEvent` with defaults.
 *
 * Priority for page size:
 * 1. `options.pageSize` if provided.
 * 2. `config.defaultPageSize` if `config` is provided.
 * 3. `inject(PortalConfig).defaultPageSize` otherwise.
 *
 * IMPORTANT: when neither `options.pageSize` nor `config` is provided this
 * function calls `inject(PortalConfig)` and therefore MUST be executed in an
 * Angular injection context (for example inside a provider factory, a
 * component/service constructor, or any function invoked during DI).
 *
 * @template Sort - type of the sort field
 * @param options - initial pagination options
 * @param config - optional portal configuration to read defaultPageSize from
 * @returns initialized `OffsetPaginationEvent<Sort>` with page set to 0
 */
export function createPaginationEvent<Sort>(
    options: InitPaginationOptions<Sort>,
    config?: PortalConfig,
): OffsetPaginationEvent<Sort> {
    const pageSize = options.pageSize
        ? options.pageSize
        : config
          ? config.defaultPageSize
          : inject(PortalConfig).defaultPageSize;
    return {
        page: 0,
        size: pageSize,
        sort: options.sort ?? undefined,
        sortDir: options.sortDir ?? 'asc',
    };
}

/**
 * Create an empty `PaginatedResource` with an initialized pagination size.
 *
 * Priority for initial size:
 * 1. `initialSize` if provided.
 * 2. `config.defaultPageSize` if `config` is provided.
 * 3. `inject(PortalConfig).defaultPageSize` otherwise.
 *
 * IMPORTANT: when neither `initialSize` nor `config` is provided this
 * function calls `inject(PortalConfig)` and therefore MUST be executed in an
 * Angular injection context (for example inside a provider factory, a
 * component/service constructor, or any function invoked during DI).
 *
 * @template T - type of the resource elements
 * @param initialSize - optional explicit initial page size
 * @param config - optional portal configuration to read defaultPageSize from
 * @returns initialized empty `PaginatedResource<T>` with pagination size set
 */
export function createPaginatedResource<T>(
    initialSize?: number,
    config?: PortalConfig,
): PaginatedResource<T> {
    const initialSizeNonNull = initialSize
        ? initialSize
        : config
          ? config.defaultPageSize
          : inject(PortalConfig).defaultPageSize;
    return {
        elements: [],
        pagination: {
            size: initialSizeNonNull,
            numberOfElements: 0,
            totalElements: 0,
        },
    };
}

/**
 * Create an `OffsetPaginationEvent` configured for "infinite" pagination.
 *
 * The returned event uses `Number.MAX_SAFE_INTEGER` as the page size to
 * effectively request a single large page. `page` is set to 0. `sort` and
 * `sortDir` are optional and passed through if provided.
 *
 * @template Sort - type of the sort field
 * @param sort - optional sort field
 * @param sortDir - optional sort direction
 * @returns `OffsetPaginationEvent<Sort>` with a very large `size` and page 0
 */
export function createInfinitePaginationEvent<Sort>(
    sort?: Sort,
    sortDir?: SortDir,
): OffsetPaginationEvent<Sort> {
    return createPaginationEvent<Sort>({
        sort: sort,
        sortDir: sortDir,
        pageSize: Number.MAX_SAFE_INTEGER,
    });
}

/**
 * Create an empty `PaginatedResource` configured for "infinite" pagination.
 *
 * The returned resource uses `Number.MAX_SAFE_INTEGER` as the pagination size
 * to represent an effectively unbounded page. Elements are initialized to an
 * empty array and counts are set to zero.
 *
 * @template T - type of the resource elements
 * @returns initialized empty `PaginatedResource<T>` with `size` set to
 * `Number.MAX_SAFE_INTEGER`
 */
export function createInfinitePaginatedResource<T>(): PaginatedResource<T> {
    return createPaginatedResource<T>(Number.MAX_SAFE_INTEGER);
}
