import {OffsetPaginatedElementsPollingService} from '@sentinel/common';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {Request} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated requests and other operations to modify data.
 */
export abstract class RequestsService extends OffsetPaginatedElementsPollingService<Request> {
    protected constructor(pageSize: number, pollPeriod: number) {
        super(pageSize, pollPeriod);
    }

    /**
     * @param poolId id of a pool associated with requests
     * @param pagination requested pagination
     */
    abstract getAll(poolId: number, pagination: OffsetPaginationEvent): Observable<PaginatedResource<Request>>;

    abstract cancel(request: Request): Observable<any>;

    abstract delete(request: Request): Observable<any>;
}
