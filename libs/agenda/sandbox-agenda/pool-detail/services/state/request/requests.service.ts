import { OffsetPaginatedElementsPollingService } from '@sentinel/common';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Request } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { AllocationRequestSort } from '@crczp/sandbox-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated requests and other operations to modify data.
 */
export abstract class RequestsService extends OffsetPaginatedElementsPollingService<
    Request,
    AllocationRequestSort
> {
    protected constructor(pageSize: number, pollPeriod: number) {
        super(pageSize, pollPeriod);
    }

    /**
     * @param poolId id of a pool associated with requests
     * @param pagination requested pagination
     */
    abstract getAll(
        poolId: number,
        pagination: OffsetPaginationEvent<AllocationRequestSort>,
    ): Observable<OffsetPaginatedResource<Request>>;

    abstract cancel(request: Request): Observable<any>;

    abstract delete(request: Request): Observable<any>;
}
