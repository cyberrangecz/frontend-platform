import { OffsetPaginatedElementsService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';

export abstract class AdaptiveInstanceOverviewService extends OffsetPaginatedElementsService<TrainingInstance> {
    abstract getAll(pagination: OffsetPaginationEvent, filter: string): Observable<PaginatedResource<TrainingInstance>>;

    abstract create(): Observable<any>;

    abstract edit(id: number): Observable<any>;

    abstract download(id: number): Observable<any>;

    abstract delete(trainingInstance: TrainingInstance): Observable<PaginatedResource<TrainingInstance>>;

    abstract runs(id: number): Observable<any>;

    abstract token(id: number): Observable<any>;

    abstract progress(id: number): Observable<any>;

    abstract results(id: number): Observable<any>;

    /**
     * Returns size of a pool specified by @poolId and '-' if the pool does not exist.
     * @param poolId ID of a pool
     */
    abstract getPoolSize(poolId: number): Observable<string>;

    abstract poolExists(poolId: number): Observable<boolean>;

    /**
     * Gets available sandboxes of pool specified by @poolId and returns an empty
     * string if pool does not exist.
     * @param poolId ID of a pool
     */
    abstract getAvailableSandboxes(poolId: number): Observable<string>;

    abstract getSshAccess(poolId: number): Observable<boolean>;
}
