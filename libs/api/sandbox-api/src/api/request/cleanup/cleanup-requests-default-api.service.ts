import {CleanupRequestsApi} from './cleanup-requests.api.service';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {
    CleanupRequest,
    NetworkingAnsibleCleanupStage,
    TerraformCleanupStage,
    UserAnsibleCleanupStage,
} from '@crczp/sandbox-model';
import {HttpClient} from '@angular/common/http';
import {RequestDTO} from '../../../dto/sandbox-instance/request-dto';
import {map} from 'rxjs/operators';
import {RequestMapper} from '../../../mappers/sandbox-instance/request-mapper';
import {TerraformCleanupStageDTO} from '../../../dto/sandbox-instance/stages/terraform-cleanup-stage-dto';
import {RequestStageMapper} from '../../../mappers/sandbox-instance/request-stage-mapper';
import {AnsibleCleanupStageDTO} from '../../../dto/sandbox-instance/stages/ansible-cleanup-stage-dto';
import {PortalConfig} from "@crczp/common";

/**
 * Default implementation of service abstracting http communication with cleanup requests endpoints.
 */
@Injectable()
export class CleanupRequestsDefaultApi extends CleanupRequestsApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = inject(PortalConfig).basePaths.sandbox + 'cleanup-requests';
    private readonly stagesUriExtension = 'stages';

    constructor() {
        super();
    }

    /**
     * Sends http request to get cleanup request
     * @param requestId id of the request to retrieve
     */
    get(requestId: number): Observable<CleanupRequest> {
        return this.http
            .get<RequestDTO>(`${this.apiUrl}/${requestId}`)
            .pipe(map((response) => RequestMapper.fromCleanupDTO(response)));
    }

    /**
     * Sends http request to cancel cleanup request
     * @param requestId id of the request to cancel
     */
    cancel(requestId: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${requestId}/cancel`, {});
    }

    /**
     * Sends http request to retrieve networking ansible stage detail
     * @param requestId id of the request associated with the networking ansible stage
     */
    getNetworkingAnsibleStage(requestId: number): Observable<NetworkingAnsibleCleanupStage> {
        return this.http
            .get<AnsibleCleanupStageDTO>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/networking-ansible`,
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
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/user-ansible`,
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
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/terraform`,
            )
            .pipe(map((resp) => RequestStageMapper.fromTerraformCleanupDTO(resp)));
    }
}
