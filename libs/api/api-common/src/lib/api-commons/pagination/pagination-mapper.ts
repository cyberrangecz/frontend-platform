import { OffsetPagination } from '@sentinel/common/pagination';
import { DjangoOffsetPaginationDTO, JavaOffsetPaginationDTO } from './pagination-types';

export class PaginationMapper {


    public static fromJavaDTO(paginationDTO: JavaOffsetPaginationDTO): OffsetPagination {
        return new OffsetPagination(
            paginationDTO.number,
            paginationDTO.number_of_elements,
            paginationDTO.size,
            paginationDTO.total_elements,
            paginationDTO.total_pages,
        );
    }

    /**
     * Maps DJANGO API pagination to our internal model
     * NOTE: Page index is reduced by one because it starts with 0 internally, while with 1 in API
     * @param resourceDTO paginated resource dto
     */
    static fromDjangoDTO(resourceDTO: DjangoOffsetPaginationDTO): OffsetPagination {
        return new OffsetPagination(
            resourceDTO.page - 1, // we need to subtract one because DJANGO API starts with 1 while internally, we start with 0
            resourceDTO.count,
            resourceDTO.page_size,
            resourceDTO.total_count,
            resourceDTO.page_count,
        );
    }
}
