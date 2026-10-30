import { Observable } from 'rxjs';
import {
    CleanupRequest,
    StopPendingResult,
    NetworkingAnsibleCleanupStage,
    TerraformCleanupStage,
    UserAnsibleCleanupStage,
} from '@crczp/sandbox-model';
import { map } from 'rxjs/operators';
import { CancellationMapper } from '../../mappers/sandbox-instance/cancellation-mapper';
import { StopPendingResultDTO } from '../../dto/sandbox-instance/cancellation-dto';
import { RequestStageMapper } from '../../mappers/sandbox-instance/request-stage-mapper';
import { TerraformCleanupStageDTO } from '../../dto/sandbox-instance/stages/terraform-cleanup-stage-dto';
import { RequestMapper } from '../../mappers/sandbox-instance/request-mapper';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PortalConfig } from '@crczp/utils';
import { RequestDTO } from '../../dto/sandbox-instance/request-dto';
import { AnsibleCleanupStageDTO } from '../../dto/sandbox-instance/stages/ansible-cleanup-stage-dto';

/**
 * Service abstracting http communication with cleanup requests endpoints.
 */
@Injectable()
export class CleanupRequestsApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl =
        inject(PortalConfig).basePaths.sandbox + '/cleanup-requests';
    private readonly stagesUriExtension = 'stages';

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
     * @returns whether the stop is still pending, its end not confirmed yet
     */
    cancel(requestId: number): Observable<StopPendingResult> {
        return this.http
            .patch<StopPendingResultDTO>(
                `${this.apiUrl}/${requestId}/cancel`,
                {},
            )
            .pipe(map((dto) => CancellationMapper.stopPendingFromDTO(dto)));
    }

    /**
     * Sends http request to retrieve networking ansible stage detail
     * @param requestId id of the request associated with the networking ansible stage
     */
    getNetworkingAnsibleStage(
        requestId: number,
    ): Observable<NetworkingAnsibleCleanupStage> {
        return this.http
            .get<AnsibleCleanupStageDTO>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/networking-ansible`,
            )
            .pipe(
                map((resp) =>
                    RequestStageMapper.fromNetworkingAnsibleCleanupDTO(resp),
                ),
            );
    }

    /**
     * Sends http request to retrieve user ansible stage detail
     * @param requestId id of the request associated with the user ansible stage
     */
    getUserAnsibleStage(
        requestId: number,
    ): Observable<UserAnsibleCleanupStage> {
        return this.http
            .get<AnsibleCleanupStageDTO>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/user-ansible`,
            )
            .pipe(
                map((resp) =>
                    RequestStageMapper.fromUserAnsibleCleanupDTO(resp),
                ),
            );
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
            .pipe(
                map((resp) => RequestStageMapper.fromTerraformCleanupDTO(resp)),
            );
    }
}
