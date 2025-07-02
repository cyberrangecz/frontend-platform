import {SentinelFilter} from '@sentinel/common/filter';
import {HttpParams} from '@angular/common/http';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';

export class ParamsBuilder {
    /**
     * Transforms filters to http params in server supported format
     * @param filters filters to transform into http params
     */
    static filterParams(filters?: SentinelFilter[]): HttpParams {
        let params = new HttpParams();
        if (!filters) { return params; }
        filters.forEach((filter) => (params = params.set(filter.paramName, filter.value)));
        return params;
    }


    /**
     * Transforms requested pagination object to http params in trainings microservice format (JAVA API)
     * @param pagination requested pagination
     */
    static javaPaginationParams(pagination: OffsetPaginationEvent): HttpParams {
        if (pagination) {
            if (pagination.sort) {
                const sort = pagination.sort + ',' + (pagination.sortDir ? pagination.sortDir : 'asc');
                return new HttpParams()
                    .set('page', pagination.page.toString())
                    .set('size', pagination.size.toString())
                    .set('sort', sort);
            } else {
                return new HttpParams().set('page', pagination.page.toString()).set('size', pagination.size.toString());
            }
        }
        return new HttpParams().set('page', '0').set('size', '10');
    }

    /**
     * Transforms requested pagination object to http params in sandbox microservice format (PYTHON API)
     * @param pagination requested pagination
     */
    static djangoPaginationParams(pagination: OffsetPaginationEvent): HttpParams {
        if (pagination) {
            if (pagination.sort) {
                return new HttpParams()
                    .set('page', (pagination.page + 1).toString()) // + 1 because sandbox microservice pages starts with 1 instead of 0
                    .set('page_size', pagination.size.toString())
                    .set('sort_by', pagination.sort)
                    .set('order', pagination.sortDir);
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
