import { OffsetPaginatedElementsService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Pool } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated pools and other operations to modify data.
 */
export abstract class PoolOverviewService extends OffsetPaginatedElementsService<Pool> {
    protected constructor(pageSize: number) {
        super(pageSize);
    }

    /**
     * @param pagination requested pagination
     */
    abstract getAll(pagination: OffsetPaginationEvent): Observable<PaginatedResource<Pool>>;

    /**
     * Deletes a pool
     * @param pool a pool to delete
     */
    abstract delete(pool: Pool): Observable<any>;

    /**
     * Allocates sandbox instances to a pool
     * @param pool a pool to be allocated
     * @param count number of sandbox instance to be allocated
     */
    abstract allocate(pool: Pool, count: number): Observable<any>;

    /**
     * Clears a pool by deleting all sandbox instances
     * @param pool a pool to be cleared
     */
    abstract clear(pool: Pool): Observable<any>;

    abstract create(): Observable<any>;

    abstract lock(pool: Pool): Observable<any>;

    abstract unlock(pool: Pool): Observable<any>;

    abstract getSshAccess(poolId: number): Observable<boolean>;

    abstract update(pool: Pool): Observable<any>;

    abstract updateComment(pool: Pool): Observable<any>;
}
