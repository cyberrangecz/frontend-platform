import { PaginationMapper } from './pagination-mapper';
import { DjangoResourceDTO } from '../DTOs/other/django-resource-dto';

describe('PaginationMapper', () => {
    it('should map correctly', () => {
        const dto: DjangoResourceDTO<any> = {
            page: 1,
            count: 5,
            page_size: 10,
            total_count: 5,
            page_count: 20,
            results: [],
        };

        const pagination = PaginationMapper.fromDjangoAPI(dto);
        expect(pagination.page).toEqual(dto.page - 1);
        expect(pagination.numberOfElements).toEqual(dto.count);
        expect(pagination.size).toEqual(dto.page_size);
        expect(pagination.totalElements).toEqual(dto.total_count);
        expect(pagination.totalPages).toEqual(dto.page_count);
    });
});
