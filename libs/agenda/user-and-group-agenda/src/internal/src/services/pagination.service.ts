import { Injectable } from '@angular/core';

type Pagination = { [id: string]: number };

@Injectable()
export class DefaultPaginationService {
    constructor(private readonly DEFAULT_PAGINATION: number = 10) {
    }

    private static readPagination(): Pagination {
        const paginationStr = window.localStorage.getItem('pagination') || '{}';
        try {
            const paginationObj = JSON.parse(paginationStr);
            return typeof paginationObj === 'object' ? paginationObj : {};
        } catch (error) {
            console.warn('DefaultPaginationService: Failed to parse pagination from local storage');
            console.warn(error);
            return {};
        }
    }

    private static writePagination(pagination: Pagination): void {
        window.localStorage.setItem('pagination', JSON.stringify(pagination));
    }

    /**
     * Returns selected pagination size from local storage or default when none was selected yet
     * @param id id of the component
     */
    getPagination(id: string): number {
        return DefaultPaginationService.readPagination()[id] || this.DEFAULT_PAGINATION;
    }

    /**
     * Sets desired pagination for to local storage
     * @param id id of the component
     * @param paginationSize desired pagination
     */
    setPagination(id: string, paginationSize: number): void {
        const pagination = DefaultPaginationService.readPagination();
        pagination[id] = paginationSize;
        DefaultPaginationService.writePagination(pagination);
    }
}
