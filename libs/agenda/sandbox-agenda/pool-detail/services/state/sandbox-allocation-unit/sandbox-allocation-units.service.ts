import { LoadingTracker, OffsetPaginationEvent } from '@crczp/utils';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { SandboxAllocationUnit, UnitCancellation } from '@crczp/sandbox-model';
import { SandboxAllocationUnitSort } from '@crczp/sandbox-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

export abstract class SandboxAllocationUnitsService {
    /**
     * Paginated resource containing pagination info and retrieved elements of SandboxAllocationUnit type.
     * Client should subscribe to the observable
     * @contract must be updated every time new data are received
     */
    units$: Observable<OffsetPaginatedResource<SandboxAllocationUnit>>;
    /**
     * @contract Needs to be updated in onManualResourceRefresh method
     * Last pagination used when requesting new data
     */
    protected lastPagination: OffsetPaginationEvent<SandboxAllocationUnitSort>;
    /**
     * True if server returned error response on the latest request, false otherwise
     * Change internally in extending service. Client should subscribe to the observable
     */
    protected hasErrorSubject$: BehaviorSubject<boolean> = new BehaviorSubject(
        false,
    );
    /**
     * True if server returned error response on the latest request, false otherwise
     * @contract must be updated every time new data are received
     */
    hasError$: Observable<boolean> = this.hasErrorSubject$.asObservable();
    /**
     * True once a fetch of allocation units has produced a result.
     * Change internally in extending service. Client should subscribe to the observable
     * @contract must be updated every time new data are received
     */
    protected initialFetchCompletedSubject$: BehaviorSubject<boolean> =
        new BehaviorSubject(false);
    /**
     * True until allocation units are first received from the server. Stays false across the
     * polling that follows, so a periodic refresh does not read as a load.
     */
    isLoading$: Observable<boolean> = this.initialFetchCompletedSubject$.pipe(
        map((initialFetchCompleted) => !initialFetchCompleted),
    );
    /**
     * Paginated resource containing pagination info and retrieved elements of SandboxAllocationUnit type.
     * Client should subscribe to the observable
     * @contract must be updated every time new data are received
     */
    protected unitsSubject$: BehaviorSubject<
        OffsetPaginatedResource<SandboxAllocationUnit>
    >;

    private readonly deletionTracker = new LoadingTracker();

    /**
     * True while a delete or cancel request, or the refresh following it, is in flight.
     */
    readonly isDeleting$: Observable<boolean> = this.deletionTracker.isLoading$;

    /**
     * Runs a delete or cancel request so that it counts towards isDeleting$ until it completes, fails or is unsubscribed.
     * @param request produces the request, subscribed to on demand
     */
    trackDeletion<T>(request: () => Observable<T>): Observable<T> {
        return this.deletionTracker.trackRequest(request);
    }

    /**
     * Gets all sandbox allocation units for pool with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with requests for sandbox allocation units for pool
     * @param pagination requested pagination
     */
    abstract getAll(
        poolId: number,
        pagination: OffsetPaginationEvent<SandboxAllocationUnitSort>,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>>;

    /**
     * Fetches the sandbox allocation units once with the pagination last requested and publishes them
     * to the units stream, adding no poll. Completes without a request when no units were loaded yet.
     * @param poolId id of the pool to refresh; defaults to the pool last requested
     */
    abstract refresh(poolId?: number): Observable<
        OffsetPaginatedResource<SandboxAllocationUnit>
    >;

    /**
     * Update an existing allocation unit.
     * @param unit a sandbox allocation unit to update
     */
    abstract update(
        unit: SandboxAllocationUnit,
    ): Observable<SandboxAllocationUnit>;

    /**
     * Starts cleanup requests for all allocation units in a given pool specified by @poolId.
     * @param poolId id of pool for which the cleanup requests are created
     * @param force when set to true force delete is used
     */
    abstract cleanupMultiple(poolId: number, force?: boolean): Observable<any>;

    /**
     * Starts cleanup requests for all failed allocation units in a given pool specified by @poolId.
     * @param poolId id of pool for which the cleanup requests are created
     * @param force when set to true force delete is used
     */
    abstract cleanupFailed(poolId: number, force: boolean): Observable<any>;

    /**
     * Starts cleanup requests for all unlocked allocation units in a given pool specified by @poolId.
     * @param poolId id of pool for which the cleanup requests are created
     * @param force when set to true force delete is used
     */
    abstract cleanupUnlocked(poolId: number, force: boolean): Observable<any>;

    /**
     * Asks to confirm stopping every unfinished allocation of a pool, then stops them.
     * The confirmation counts the unfinished allocations among the units shown.
     * @param poolId id of the pool
     */
    abstract cancelAllocations(poolId: number): Observable<UnitCancellation[]>;

    /**
     * Initializes default resources with given pageSize
     * @param pageSize size of a page for pagination
     */
    protected abstract initSubject(
        pageSize: number,
    ): OffsetPaginatedResource<SandboxAllocationUnit>;
}
