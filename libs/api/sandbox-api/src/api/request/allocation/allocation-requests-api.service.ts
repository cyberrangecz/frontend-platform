import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {
    AllocationRequest,
    CloudResource,
    NetworkingAnsibleAllocationStage,
    TerraformAllocationStage,
    TerraformOutput,
    UserAnsibleAllocationStage,
} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';

/**
 * Service abstracting http communication with allocation requests endpoints.
 */
export abstract class AllocationRequestsApi {
    /**
     * Sends http request to get allocation request
     * @param requestId id of the request to retrieve
     */
    abstract get(requestId: number): Observable<AllocationRequest>;

    /**
     * Sends http request to cancel allocation request associated with a pool and a request
     * @param requestId id of the request to cancel
     */
    abstract cancel(requestId: number): Observable<any>;

    /**
     * Sends http request to retrieve networking ansible stage detail
     * @param requestId id of the associated request
     */
    abstract getNetworkingAnsibleStage(requestId: number): Observable<NetworkingAnsibleAllocationStage>;

    /**
     * Sends http request to retrieve networking ansible stage detail
     * @param requestId id of the associated request
     */
    abstract getUserAnsibleStage(requestId: number): Observable<UserAnsibleAllocationStage>;

    /**
     * Sends http request to retrieve networking ansible stage output
     * @param requestId id of the associated request
     * @param pagination requested pagination
     */
    abstract getNetworkingAnsibleOutputs(
        requestId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<string>>;

    /**
     * Sends http request to retrieve user ansible stage output
     * @param requestId id of the associated request
     * @param pagination requested pagination
     */
    abstract getUserAnsibleOutputs(
        requestId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<string>>;

    /**
     * Sends http request to retrieve terraform stage detail
     * @param requestId id of the associated request
     */
    abstract getTerraformStage(requestId: number): Observable<TerraformAllocationStage>;

    /**
     * Sends http request to get terraform allocation outputs
     * @param requestId id of the associated request
     * @param pagination requested pagination
     */
    abstract getTerraformOutputs(
        requestId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<TerraformOutput>>;

    /**
     * Sends http request to get terraform allocation resources
     * @param requestId id of the associated request
     * @param pagination requested pagination
     */
    abstract getCloudResources(
        requestId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<CloudResource>>;
}
