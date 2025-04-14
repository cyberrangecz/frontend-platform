import { HttpParams } from '@angular/common/http';
import { SentinelFilter } from '@sentinel/common/filter';

/**
 * Class transforming internal filter to http params
 */
export class FilterParams {
    /**
     * transforms internal filter to http params
     * @param filters filters to be transformed to http params
     */
    static create(filters?: SentinelFilter[]): HttpParams {
        let params = new HttpParams();
        if (!filters) {
            return params;
        }
        filters.forEach((filter) => (params = params.set(filter.paramName, filter.value)));
        return params;
    }
}
