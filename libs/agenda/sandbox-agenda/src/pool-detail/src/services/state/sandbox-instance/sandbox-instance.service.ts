import { OffsetPaginatedElementsPollingService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource, PaginationBaseEvent } from '@sentinel/common/pagination';
import { SandboxAllocationUnit, SandboxInstance } from '@crczp/sandbox-model';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated sandbox instances and other operations to modify data.
 */
export abstract class SandboxInstanceService extends OffsetPaginatedElementsPollingService<SandboxInstance> {
    protected constructor(pageSize: number, pollPeriod: number) {
        super(pageSize, pollPeriod);
    }

    /**
     * Paginated resource containing pagination info and retrieved elements of SandboxAllocationUnit type.
     * Client should subscribe to the observable
     * @contract must be updated every time new data are received
     */
    protected allocationUnitsSubject$: BehaviorSubject<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Paginated resource containing pagination info and retrieved elements of SandboxAllocationUnit type.
     * Client should subscribe to the observable
     * @contract must be updated every time new data are received
     */
    allocationUnits$: Observable<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * @param poolId id of a pool associated with sandbox instances
     * @param pagination requested pagination
     */
    abstract getAllSandboxes(
        poolId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<SandboxInstance>>;

    /**
     * Gets all sandbox allocation units for pool with passed pagination and updates related observables or handles an error
     * @param poolId id of a pool associated with requests for sandbox allocation units for pool
     * @param pagination requested pagination
     */
    abstract getAllUnits(
        poolId: number,
        pagination: PaginationBaseEvent,
    ): Observable<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Deletes a sandbox instance
     * @param sandboxInstance a sandbox instance to be deleted
     */
    abstract delete(sandboxInstance: SandboxInstance): Observable<any>;

    /**
     * Starts allocation of a sandbox instance in a provided pool
     * @param poolId id of a pool in which the allocation will take place
     * @param count count final number of sandboxes for allocation
     */
    abstract allocate(poolId: number, count: number): Observable<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Starts allocation of specified number of sandbox instances in a provided pool
     * @param poolId id of a pool in which the allocation will take place
     * @param total maximum total number of sandboxes that can be allocated
     */
    abstract allocateSpecified(poolId: number, total: number): Observable<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Retries an allocation of a sandbox instance, informs about the result and updates list of requests or handles an error
     * @param unitId id of a unit for which retry will be performed
     */
    abstract retryAllocate(unitId: number): Observable<PaginatedResource<SandboxInstance>>;

    /**
     * Unlocks a sandbox instance making it available for modification
     * @param allocationUnitId a sandbox instance to be unlocked represented by its id
     */
    abstract unlock(allocationUnitId: number): Observable<any>;

    /**
     * Lock a sandbox instance making it unavailable for modification and save for usage
     * @param allocationUnitId a sandbox instance to be unlocked represented by its id
     */
    abstract lock(allocationUnitId: number): Observable<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Gets zip file that contains configurations, key and script for remote ssh access for user
     * @param sandboxUuid id of the sandbox for which remote ssh access is demanded
     */
    abstract getUserSshAccess(sandboxUuid: string): Observable<boolean>;

    /**
     * Redirects to topology associated with given allocation unit of the given pool
     * @param poolId id of the pool
     * @param sandboxUuid id of the sandbox
     */
    abstract showTopology(poolId: number, sandboxUuid: string): Observable<boolean>;

    /**
     * Starts cleanup for all allocation units in pool identified by @poolId
     * @param poolId id of pool for which the cleanup request of units is created
     * @param force when set to true force delete is used
     */
    abstract cleanupMultiple(poolId: number, force: boolean): Observable<any>;

    /**
     * Starts cleanup requests for all failed allocation requests for pool specified by @poolId.
     * @param poolId id of pool for which the cleanup request of units is created
     * @param force when set to true force delete is used
     */
    abstract cleanupFailed(poolId: number, force: boolean): Observable<any>;

    /**
     * Starts cleanup requests for all unlocked allocation requests for pool specified by @poolId.
     * @param poolId id of pool for which the cleanup request of units is created
     * @param force when set to true force delete is used
     */
    abstract cleanupUnlocked(poolId: number, force: boolean): Observable<any>;

    /**
     * Starts cleanup for sandbox specified in @unitIds.
     * @param unitId allocation unit id which should be deleted
     */
    abstract createCleanup(unitId: number): Observable<any>;

    /**
     * Redirects to desired detail of stage of the allocation unit.
     * @param poolId id of the pool
     * @param sandboxId id of allocation unit
     * @param stageOrder order of desired stage
     */
    abstract navigateToStage(poolId: number, sandboxId: number, stageOrder: number): Observable<boolean>;

    /**
     * Updates allocation unit and informs about the result or handles an error
     * Use only for updating comment
     * @param allocationUnit
     */
    abstract updateComment(allocationUnit: SandboxAllocationUnit): Observable<SandboxAllocationUnit>;
}
