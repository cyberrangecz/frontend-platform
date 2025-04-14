import { OffsetPagination } from '@sentinel/common/pagination';
import { DjangoResourceDTO } from '../DTOs/other/django-resource-dto';

export class PaginationMapper {
    /**
     * Maps DJANGO API pagination to our internal model
     * NOTE: Page index is reduced by one because it starts with 0 internally, while with 1 in API
     * @param resourceDTO paginated resource dto
     */
    static fromDjangoAPI(resourceDTO: DjangoResourceDTO<any>): OffsetPagination {
        return new OffsetPagination(
            resourceDTO.page - 1, // we need to subtract one because DJANGO API starts with 1 while internally, we start with 0
            resourceDTO.count,
            resourceDTO.page_size,
            resourceDTO.total_count,
            resourceDTO.page_count,
        );
    }
}
