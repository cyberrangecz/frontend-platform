import { OffsetPaginationEvent } from '@crczp/utils';
import {
    AllocationRequest,
    CloudResource,
    LogOutput,
    NetworkingAnsibleAllocationStage,
    RequestStageType,
    StopPendingResult,
    TerraformAllocationStage,
    UserAnsibleAllocationStage,
} from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CancellationMapper } from '../../mappers/sandbox-instance/cancellation-mapper';
import { StopPendingResultDTO } from '../../dto/sandbox-instance/cancellation-dto';
import { RequestStageMapper } from '../../mappers/sandbox-instance/request-stage-mapper';
import {
    CRCZPHttpService,
    DjangoResourceDTO,
    OffsetPaginatedResource,
    PaginationMapper,
    ParamsBuilder,
} from '@crczp/api-common';
import { AnsibleAllocationStageDTO } from '../../dto/sandbox-instance/stages/ansible-allocation-stage-dto';
import { TerraformAllocationStageDTO } from '../../dto/sandbox-instance/stages/terraform-allocation-stage-dto';
import { RequestMapper } from '../../mappers/sandbox-instance/request-mapper';
import { CloudResourceDTO } from '../../dto/sandbox-instance/stages/cloud-resource-dto';
import { inject, Injectable } from '@angular/core';
import { PortalConfig } from '@crczp/utils';
import { HttpClient } from '@angular/common/http';
import { RequestDTO } from '../../dto/sandbox-instance/request-dto';
import { ResourceUsageSort } from '../sorts';
import { LogOutputDTO } from '../../dto/sandbox-instance/stages/log-output-dto';
import { logOutputMapper } from '../../mappers/sandbox-instance/log-output-mapper';

/**
 * Service abstracting http communication with allocation requests endpoints.
 */
@Injectable()
export class AllocationRequestsApi {
    private readonly http = inject(HttpClient);
    private readonly httpService = inject(CRCZPHttpService);

    private readonly apiUrl =
        inject(PortalConfig).basePaths.sandbox + '/allocation-requests';
    private readonly stagesUriExtension = 'stages';

    /**
     * Sends http request to get allocation request
     * @param requestId id of the request to retrieve
     */
    get(requestId: number): Observable<AllocationRequest> {
        return this.http
            .get<RequestDTO>(`${this.apiUrl}/${requestId}`)
            .pipe(map((response) => RequestMapper.fromAllocationDTO(response)));
    }

    /**
     * Sends http request to cancel allocation request
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
    ): Observable<NetworkingAnsibleAllocationStage> {
        return this.http
            .get<AnsibleAllocationStageDTO>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/networking-ansible`,
            )
            .pipe(
                map((resp) =>
                    RequestStageMapper.fromNetworkingAnsibleAllocationDTO(resp),
                ),
            );
    }

    /**
     * Sends http request to retrieve the outputs a stage wrote from a row on.
     * @param stageType type of the stage whose outputs are retrieved
     * @param requestId id of the request associated with the stage
     * @param fromRow first row to retrieve
     * @param expectedErrors HTTP status codes whose failure opens no error notification
     */
    getStageOutputs(
        stageType: RequestStageType,
        requestId: number,
        fromRow?: number,
        expectedErrors: number[] = [],
    ): Observable<LogOutput> {
        return this.httpService
            .get<LogOutputDTO>(
                `${this.getBaseUrlByStageType(stageType, requestId)}/outputs`,

                'Fetching networking ansible outputs',
            )
            .setExpectedErrors(expectedErrors)
            .withParams(fromRow !== null ? { from_row: fromRow } : {})
            .withReceiveMapper(logOutputMapper)
            .execute();
    }

    /**
     * Sends http request to retrieve user ansible stage detail
     * @param requestId id of the request associated with the user ansible stage
     */
    getUserAnsibleStage(
        requestId: number,
    ): Observable<UserAnsibleAllocationStage> {
        return this.http
            .get<AnsibleAllocationStageDTO>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/user-ansible`,
            )
            .pipe(
                map((resp) =>
                    RequestStageMapper.fromUserAnsibleAllocationDTO(resp),
                ),
            );
    }

    /**
     * Sends http request to retrieve a terraform stage associated with the request id
     * @param requestId id of the request associated with the terraform stage
     */
    getTerraformStage(requestId: number): Observable<TerraformAllocationStage> {
        return this.http
            .get<TerraformAllocationStageDTO>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/terraform`,
            )
            .pipe(
                map((resp) =>
                    RequestStageMapper.fromTerraformAllocationDTO(resp),
                ),
            );
    }

    /**
     * Sends http request to retrieve resources of terraform allocation stage
     * @param requestId id of the request associated with the terraform stage
     * @param pagination requested pagination
     */
    getCloudResources(
        requestId: number,
        pagination: OffsetPaginationEvent<ResourceUsageSort>,
    ): Observable<OffsetPaginatedResource<CloudResource>> {
        return this.http
            .get<DjangoResourceDTO<CloudResourceDTO>>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/openstack/resources`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new OffsetPaginatedResource<CloudResource>(
                            RequestStageMapper.fromCloudResourceDTOs(
                                response.results,
                            ),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }

    private getBaseUrlByStageType(
        stageType: RequestStageType,
        requestId: number,
    ): string {
        switch (stageType) {
            case RequestStageType.NETWORKING_ANSIBLE_ALLOCATION:
                return `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/networking-ansible`;
            case RequestStageType.USER_ANSIBLE_ALLOCATION:
                return `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/user-ansible`;
            case RequestStageType.TERRAFORM_ALLOCATION:
                return `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/terraform`;
            default:
                throw new Error('Unsupported stage type for outputs retrieval');
        }
    }
}
