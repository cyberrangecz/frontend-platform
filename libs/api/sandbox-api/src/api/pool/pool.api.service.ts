import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {
    AllocationRequest,
    CleanupRequest,
    Lock,
    Pool,
    SandboxAllocationUnit,
    SandboxDefinition,
    SandboxInstance,
    SandboxKeyPair,
} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';

/**
 * Service abstracting http communication with pools endpoints.
 */
export abstract class PoolApi {
    /**
     * Sends http request to retrieve all pools on specified page of a pagination
     * @param pagination requested pagination
     */
    abstract getPools(pagination: OffsetPaginationEvent): Observable<PaginatedResource<Pool>>;

    /**
     * Sends http request to retrieve pool by id
     * @param poolId id of the pool
     */
    abstract getPool(poolId: number): Observable<Pool>;

    /**
     * Sends http request to delete a pool
     * @param poolId id of the pool to delete
     */
    abstract deletePool(poolId: number, force: boolean): Observable<any>;

    /**
     * Sends http request to clear a pool (delete all associated sandbox instances, requests etc.)
     * @param poolId id of the pool to clear
     */
    abstract clearPool(poolId: number): Observable<any>;

    /**
     * Sends http request to create a pool
     * @param pool net pool
     */
    abstract createPool(pool: Pool): Observable<Pool>;

    /**
     * Sends http request to lock pool
     * @param poolId id of a pool to lock
     * @param trainingAccessToken the training access token
     */
    abstract lockPool(poolId: number, trainingAccessToken: string): Observable<Lock>;

    /**
     * Sends http request to allocate sandbox instances in a pool
     * @param poolId id of the pool in which sandbox instances should be allocated
     * @param count number of sandbox instance that should be allocated
     */
    abstract allocateSandboxes(poolId: number, count?: number): Observable<SandboxAllocationUnit[]>;

    /**
     * Sends http request to retrieve all allocation requests associated with a pool
     * @param poolId id of the allocation unit
     * @param pagination requested pagination
     */
    abstract getAllocationRequests(
        poolId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<AllocationRequest>>;

    /**
     * Sends http request to retrieve all cleanup requests associated with a pool
     * @param poolId id of the associated pool
     * @param pagination requested pagination
     */
    abstract getCleanupRequests(
        poolId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<CleanupRequest>>;

    /**
     * Sends http request to unlock pool
     * @param poolId id of pool to unlock
     * @param lockId id of current lock
     */
    abstract unlockPool(poolId: number, lockId: number): Observable<any>;

    /**
     * Sends http request to retrieve definition for pool
     * @param poolId id of pool
     * @param pagination requested pagination
     */
    abstract getDefinition(
        poolId: number,
        pagination?: OffsetPaginationEvent,
    ): Observable<PaginatedResource<SandboxDefinition>>;

    /**
     * Sends http request to retrieve sandbox key-pair for pool
     * @param poolId id of pool
     */
    abstract getSandboxKeyPair(poolId: number): Observable<SandboxKeyPair>;

    /**
     * Sends http request to get locks for pool
     * @param poolId id of a pool to lock
     */
    abstract getPoolsLocks(poolId: number): Observable<PaginatedResource<Lock>>;

    /**
     * Sends http request to get specific lock for pool
     * @param poolId id of a pool
     * @param lockId id of a lock
     */
    abstract getPoolsSpecificLock(poolId: number, lockId: number): Observable<Lock>;

    /**
     * Sends http request to get sandbox allocation units for pool
     * @param poolId id of a pool
     * @param pagination requested pagination
     */
    abstract getPoolsSandboxAllocationUnits(
        poolId: number,
        pagination?: OffsetPaginationEvent,
    ): Observable<PaginatedResource<SandboxAllocationUnit>>;

    /**
     * Sends http request to get unlocked sandbox in given pool and lock it
     * @param poolId id of a pool
     * @param trainingAccessToken the training access token
     */
    abstract getSandboxAndLockIt(poolId: number, trainingAccessToken: string): Observable<SandboxInstance>;

    /**
     * Sends http request to get zip file that contains configurations, key and script for remote ssh access for management
     * @param poolId id of a pool
     */
    abstract getManagementSshAccess(poolId: number): Observable<boolean>;

    /**
     * Sends http request to get sandboxes of the given pool
     * @param poolId id of a pool
     * @param pagination requested pagination
     */
    abstract getPoolsSandboxes(
        poolId: number,
        pagination?: OffsetPaginationEvent,
    ): Observable<PaginatedResource<SandboxInstance>>;

    /**
     * Sends http request to create cleanup requests for all allocation units in the given pool specified by @poolId
     * @param poolId id of a pool
     * @param force states whether the delete action should be forced
     */
    abstract createMultipleCleanupRequests(poolId: number, force?: boolean): Observable<any>;

    /**
     * Sends http request to create cleanup requests for all unlocked allocation units in the given pool specified by @poolId
     * @param poolId id of a pool
     * @param force states whether the delete action should be forced
     */
    abstract createUnlockedCleanupRequests(poolId: number, force?: boolean): Observable<any>;

    /**
     * Sends http request to create cleanup requests for all failed allocation units in the given pool specified by @poolId
     * @param poolId id of a pool
     * @param force states whether the delete action should be forced
     */
    abstract createFailedCleanupRequests(poolId: number, force?: boolean): Observable<any>;

    /**
     * Sends http request to update the pool properties
     * @param pool pool to update
     */
    abstract updatePool(pool: Pool): Observable<any>;
}
