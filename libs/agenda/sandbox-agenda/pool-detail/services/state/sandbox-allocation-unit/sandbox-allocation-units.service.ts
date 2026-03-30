import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { BehaviorSubject, Observable } from 'rxjs';
import { SandboxAllocationUnit } from '@crczp/sandbox-model';
import { AllocationRequestSort, SandboxInstanceSort } from '@crczp/sandbox-api';
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
    protected lastPagination: OffsetPaginationEvent<SandboxInstanceSort>;
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
     * Paginated resource containing pagination info and retrieved elements of SandboxAllocationUnit type.
     * Client should subscribe to the observable
     * @contract must be updated every time new data are received
     */
    protected unitsSubject$: BehaviorSubject<
        OffsetPaginatedResource<SandboxAllocationUnit>
    >;

    /**
     * Gets all sandbox allocation units for pool with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with requests for sandbox allocation units for pool
     * @param pagination requested pagination
     */
    abstract getAll(
        poolId: number,
        pagination: OffsetPaginationEvent<AllocationRequestSort>,
    ): Observable<OffsetPaginatedResource<SandboxAllocationUnit>>;

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
     * Cancels all queued (IN_QUEUE) allocation units in the given pool. Leaves deploying or built sandboxes untouched.
     * @param poolId id of pool for which queued allocations are cancelled
     */
    abstract cancelQueued(poolId: number): Observable<{ cancelled_count: number }>;

    /**
     * Force-cancels all stuck allocation units (first stage running but not finished/failed) in the pool.
     * Removes them from the Cyber Range DB only; OpenStack must be cleaned up manually.
     * @param poolId id of pool for which stuck allocations are force-cancelled
     */
    abstract forceCancelAllocation(poolId: number): Observable<{ force_cancelled_count: number }>;

    /**
     * Force-removes all units in the pool that have a cleanup request that is not finished
     * (cleanup running or stuck). Removes them from the Cyber Range DB only.
     * @param poolId id of pool for which stuck cleanups are force-removed
     */
    abstract forceCleanup(poolId: number): Observable<{ force_cleaned_count: number }>;

    /**
     * Initializes default resources with given pageSize
     * @param pageSize size of a page for pagination
     */
    protected abstract initSubject(
        pageSize: number,
    ): OffsetPaginatedResource<SandboxAllocationUnit>;
}
