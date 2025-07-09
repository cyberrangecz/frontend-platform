import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {BehaviorSubject, Observable} from 'rxjs';
import {SandboxAllocationUnit} from '@crczp/sandbox-model';

export abstract class SandboxAllocationUnitsService {
    /**
     * @contract Needs to be updated in onManualResourceRefresh method
     * Last pagination used when requesting new data
     */
    protected lastPagination: OffsetPaginationEvent;

    /**
     * True if server returned error response on the latest request, false otherwise
     * Change internally in extending service. Client should subscribe to the observable
     */
    protected hasErrorSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);

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
    protected unitsSubject$: BehaviorSubject<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Paginated resource containing pagination info and retrieved elements of SandboxAllocationUnit type.
     * Client should subscribe to the observable
     * @contract must be updated every time new data are received
     */
    units$: Observable<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Gets all sandbox allocation units for pool with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with requests for sandbox allocation units for pool
     * @param pagination requested pagination
     */
    abstract getAll(
        poolId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Update an existing allocation unit.
     * @param unit a sandbox allocation unit to update
     */
    abstract update(unit: SandboxAllocationUnit): Observable<SandboxAllocationUnit>;

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
     * Initializes default resources with given pageSize
     * @param pageSize size of a page for pagination
     */
    protected abstract initSubject(pageSize: number): PaginatedResource<SandboxAllocationUnit>;
}
