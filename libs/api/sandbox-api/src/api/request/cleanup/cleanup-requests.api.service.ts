import {Observable} from 'rxjs';
import {
    CleanupRequest,
    NetworkingAnsibleCleanupStage,
    TerraformCleanupStage,
    UserAnsibleCleanupStage,
} from '@crczp/sandbox-model';

/**
 * Service abstracting http communication with cleanup requests endpoints.
 */
export abstract class CleanupRequestsApi {
    /**
     * Sends http request to retrieve cleanup request
     * @param requestId id of the request to retrieve
     */
    abstract get(requestId: number): Observable<CleanupRequest>;

    /**
     * Sends http request to cancel cleanup request
     * @param requestId id of the request to cancel
     */
    abstract cancel(requestId: number): Observable<any>;

    /**
     * Sends http request to retrieve cleanup terraform stage detail
     * @param requestId id of the associated request
     */
    abstract getTerraformStage(requestId: number): Observable<TerraformCleanupStage>;

    /**
     * Sends http request to retrieve a networking ansible stage detail
     * @param requestId id of the associated request
     */
    abstract getNetworkingAnsibleStage(requestId: number): Observable<NetworkingAnsibleCleanupStage>;

    /**
     * Sends http request to retrieve a user ansible stage detail
     * @param requestId id of the associated request
     */
    abstract getUserAnsibleStage(requestId: number): Observable<UserAnsibleCleanupStage>;
}
