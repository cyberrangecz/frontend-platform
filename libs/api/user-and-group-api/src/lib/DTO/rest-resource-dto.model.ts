import { PaginationDTO } from './pagination-dto.model';

export class RestResourceDTO<T> {
    content: T[];
    pagination: PaginationDTO;
}
