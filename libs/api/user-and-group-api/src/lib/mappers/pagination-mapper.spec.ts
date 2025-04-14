import { PaginationMapper } from './pagination-mapper';
import { PaginationDTO } from '../DTO/pagination-dto.model';

describe('PaginationMapper', () => {
    it('should map correctly', () => {
        const dto: PaginationDTO = {
            number: 1,
            number_of_elements: 5,
            size: 10,
            total_elements: 5,
            total_pages: 20,
        };

        const pagination = PaginationMapper.mapDTOToPagination(dto);
        expect(pagination.page).toEqual(dto.number);
        expect(pagination.numberOfElements).toEqual(dto.number_of_elements);
        expect(pagination.size).toEqual(dto.size);
        expect(pagination.totalElements).toEqual(dto.total_elements);
        expect(pagination.totalPages).toEqual(dto.total_pages);
    });
});
