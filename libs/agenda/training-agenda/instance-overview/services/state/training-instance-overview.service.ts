import {OffsetPaginatedElementsService} from '@sentinel/common';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {TrainingInstance} from '@crczp/training-model';
import {Observable} from 'rxjs';

export abstract class TrainingInstanceOverviewService extends OffsetPaginatedElementsService<TrainingInstance> {
    abstract getAll(pagination: OffsetPaginationEvent, filter: string): Observable<PaginatedResource<TrainingInstance>>;

    abstract create(): Promise<boolean>;

    abstract edit(id: number): Promise<boolean>;

    abstract download(id: number): Observable<boolean>;

    abstract delete(trainingInstance: TrainingInstance): Observable<PaginatedResource<TrainingInstance>>;

    abstract runs(id: number): Promise<boolean>;

    abstract token(id: number): Promise<boolean>;

    abstract progress(id: number): Promise<boolean>;

    abstract results(id: number): Promise<boolean>;

    abstract aggregatedResults(id: number): Promise<boolean>;

    /**
     * Returns size of a pool specified by @poolId and '-' if the pool does not exist.
     * @param poolId ID of a pool
     */
    abstract getPoolSize(poolId: number): Observable<string>;

    /**
     * Gets available sandboxes of pool specified by @poolId and returns an empty
     * string if pool does not exist.
     * @param poolId ID of a pool
     */
    abstract getAvailableSandboxes(poolId: number): Observable<string>;

    abstract poolExists(poolId: number): Observable<boolean>;

    abstract getSshAccess(poolId: number): Observable<boolean>;
}
