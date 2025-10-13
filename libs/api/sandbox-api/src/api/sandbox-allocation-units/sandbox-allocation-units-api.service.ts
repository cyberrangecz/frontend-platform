import {Observable} from 'rxjs';
import {AllocationRequest, CleanupRequest, SandboxAllocationUnit} from '@crczp/sandbox-model';

/**
 * Service abstracting http communication with sandbox allocation units endpoints.
 */
export abstract class SandboxAllocationUnitsApi {
    /**
     * Sends http request to retrieve sandbox allocation unit
     * @param unitId id of the sandbox allocation unit to retrieve
     */
    abstract get(unitId: number): Observable<SandboxAllocationUnit>;

    /**
     * Sends http request to update sandbox allocation unit
     * @param unit the sandbox allocation unit to update
     */
    abstract update(unit: SandboxAllocationUnit): Observable<SandboxAllocationUnit>;

    /**
     * Sends http request to retrieve allocation request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with allocation request
     */
    abstract getAllocationRequest(unitId: number): Observable<AllocationRequest>;

    /**
     * Sends http request to retry allocation request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with allocation request
     */
    abstract createRetryRequest(unitId: number): Observable<SandboxAllocationUnit>;

    /**
     * Sends http request to retrieve cleanup request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with cleanup request
     */
    abstract getCleanupRequest(unitId: number): Observable<CleanupRequest>;

    /**
     * Sends http request to create cleanup request
     * @param unitId sandbox allocation unit id of to create cleanup request for
     */
    abstract createCleanupRequest(unitId: number): Observable<CleanupRequest>;

    /**
     * Sends http request to delete cleanup request
     * @param unitId sandbox allocation unit id of the cleanup request to delete
     */
    abstract deleteCleanupRequest(unitId: number): Observable<any>;
}
