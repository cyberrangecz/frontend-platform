import {
    OffsetPagination,
    OffsetPaginationEvent,
    PaginationEvent,
} from '@sentinel/common/pagination';
import {
    DjangoOffsetPaginationDTO,
    JavaOffsetPaginationDTO,
} from './pagination-types';

export class PaginationMapper {
    public static fromJavaDTO(
        paginationDTO: JavaOffsetPaginationDTO,
    ): OffsetPagination {
        return {
            page: paginationDTO.number,
            size: paginationDTO.size,
            totalPages: paginationDTO.total_pages,
            totalElements: paginationDTO.total_elements,
            numberOfElements: paginationDTO.number_of_elements,
        };
    }

    /**
     * Maps DJANGO API pagination to our internal model
     * NOTE: Page index is reduced by one because it starts with 0 internally, while with 1 in API
     * @param resourceDTO paginated resource dto
     */
    static fromDjangoDTO(
        resourceDTO: DjangoOffsetPaginationDTO,
    ): OffsetPagination {
        return {
            page: resourceDTO.page - 1, // API page index starts with 1
            size: resourceDTO.page_size,
            totalPages: resourceDTO.page_count,
            totalElements: resourceDTO.total_count,
            numberOfElements: resourceDTO.count,
        };
    }

    public static toOffsetPaginationEvent<T>(
        pagination: PaginationEvent<T>,
    ): OffsetPaginationEvent<T> {
        return {
            page: (pagination as OffsetPaginationEvent<T>).page ?? 0,
            size: pagination.size,
            sort: pagination.sort,
            sortDir: pagination.sortDir,
        };
    }
}
