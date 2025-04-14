import { HttpParams } from '@angular/common/http';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';

/**
 * Class transforming requested pagination object to http params into microservice supported format
 */
export class PaginationParams {
    /**
     * Transforms requested pagination object to http params in sandbox microservice format (PYTHON API)
     * @param pagination requested pagination
     */
    static create(pagination?: OffsetPaginationEvent): HttpParams {
        if (pagination) {
            if (pagination.sort) {
                const params = new HttpParams()
                    .set('page', (pagination.page + 1).toString()) // + 1 because sandbox microservice pages starts with 1 instead of 0
                    .set('page_size', pagination.size.toString())
                    .set('sort_by', pagination.sort)
                return pagination.sortDir ?
                    params.set('order', pagination.sortDir) :
                    params;
            } else {
                return new HttpParams()
                    .set('page', (pagination.page + 1).toString()) // + 1 because sandbox microservice pages starts with 1 instead of 0
                    .set('page_size', pagination.size.toString());
            }
        }
        return new HttpParams()
            .set('page', '1') // 1 because sandbox microservice pages starts with 1
            .set('page_size', '10');
    }
}
