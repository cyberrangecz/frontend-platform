import { CleanupRequestsApi } from './cleanup-requests.api.service';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
    CleanupRequest,
    NetworkingAnsibleCleanupStage,
    TerraformCleanupStage,
    UserAnsibleCleanupStage,
} from '@crczp/sandbox-model';
import { HttpClient } from '@angular/common/http';
import { SandboxApiConfigService } from '../../../others/sandbox-api-config.service';
import { RequestDTO } from '../../../DTOs/sandbox-instance/request-dto';
import { map } from 'rxjs/operators';
import { RequestMapper } from '../../../mappers/sandbox-instance/request-mapper';
import { TerraformCleanupStageDTO } from '../../../DTOs/sandbox-instance/stages/terraform-cleanup-stage-dto';
import { RequestStageMapper } from '../../../mappers/sandbox-instance/request-stage-mapper';
import { AnsibleCleanupStageDTO } from '../../../DTOs/sandbox-instance/stages/ansible-cleanup-stage-dto';

/**
 * Default implementation of service abstracting http communication with cleanup requests endpoints.
 */
@Injectable()
export class CleanupRequestsDefaultApi extends CleanupRequestsApi {
    private readonly cleanupRequestUriExtension = 'cleanup-requests';
    private readonly stagesUriExtension = 'stages';

    private readonly requestsEndpointUri: string;

    constructor(
        private http: HttpClient,
        private context: SandboxApiConfigService,
    ) {
        super();
        if (this.context.config === undefined || this.context.config === null) {
            throw new Error(
                'SandboxApiConfig is null or undefined. Please provide it in forRoot() method of SandboxApiModule' +
                    ' or provide own implementation of API services',
            );
        }
        this.requestsEndpointUri = this.context.config.sandboxRestBasePath + this.cleanupRequestUriExtension;
    }

    /**
     * Sends http request to get cleanup request
     * @param requestId id of the request to retrieve
     */
    get(requestId: number): Observable<CleanupRequest> {
        return this.http
            .get<RequestDTO>(`${this.requestsEndpointUri}/${requestId}`)
            .pipe(map((response) => RequestMapper.fromCleanupDTO(response)));
    }

    /**
     * Sends http request to cancel cleanup request
     * @param requestId id of the request to cancel
     */
    cancel(requestId: number): Observable<any> {
        return this.http.patch(`${this.requestsEndpointUri}/${requestId}/cancel`, {});
    }

    /**
     * Sends http request to retrieve networking ansible stage detail
     * @param requestId id of the request associated with the networking ansible stage
     */
    getNetworkingAnsibleStage(requestId: number): Observable<NetworkingAnsibleCleanupStage> {
        return this.http
            .get<AnsibleCleanupStageDTO>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/networking-ansible`,
            )
            .pipe(map((resp) => RequestStageMapper.fromNetworkingAnsibleCleanupDTO(resp)));
    }

    /**
     * Sends http request to retrieve user ansible stage detail
     * @param requestId id of the request associated with the user ansible stage
     */
    getUserAnsibleStage(requestId: number): Observable<UserAnsibleCleanupStage> {
        return this.http
            .get<AnsibleCleanupStageDTO>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/user-ansible`,
            )
            .pipe(map((resp) => RequestStageMapper.fromUserAnsibleCleanupDTO(resp)));
    }

    /**
     * Sends http request to retrieve a terraform stage associated with the request id
     * @param requestId id of the request associated with the terraform stage
     */
    getTerraformStage(requestId: number): Observable<TerraformCleanupStage> {
        return this.http
            .get<TerraformCleanupStageDTO>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/terraform`,
            )
            .pipe(map((resp) => RequestStageMapper.fromTerraformCleanupDTO(resp)));
    }
}
