import { OffsetPagination } from '@sentinel/common/pagination';
import { PaginationDTO } from '../DTO/pagination-dto.model';

/**
 * @dynamic
 */
export class PaginationMapper {
    static mapDTOToPagination(paginationDTO: PaginationDTO): OffsetPagination {
        return new OffsetPagination(
            paginationDTO.number,
            paginationDTO.number_of_elements,
            paginationDTO.size,
            paginationDTO.total_elements,
            paginationDTO.total_pages,
        );
    }
}
