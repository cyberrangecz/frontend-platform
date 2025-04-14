import { HttpParams } from '@angular/common/http';
import { SentinelFilter } from '@sentinel/common/filter';

/**
 * Class transforming filters to http params in server supported format
 */
export class FilterParams {
    /**
     * Transforms filters to http params in server supported format
     * @param filters filters to transform into http params
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
