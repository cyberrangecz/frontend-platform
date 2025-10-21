import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import {
    AllocationRequest,
    CloudResource,
    NetworkingAnsibleAllocationStage,
    TerraformAllocationStage,
    TerraformOutput,
    UserAnsibleAllocationStage
} from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequestStageMapper } from '../../mappers/sandbox-instance/request-stage-mapper';
import { DjangoResourceDTO, OffsetPaginatedResource, PaginationMapper, ParamsBuilder } from '@crczp/api-common';
import { AnsibleAllocationStageDTO } from '../../dto/sandbox-instance/stages/ansible-allocation-stage-dto';
import { TerraformAllocationStageDTO } from '../../dto/sandbox-instance/stages/terraform-allocation-stage-dto';
import { RequestMapper } from '../../mappers/sandbox-instance/request-mapper';
import { AnsibleAllocationOutputDTO } from '../../dto/sandbox-instance/stages/ansible-allocation-output-dto';
import { CloudResourceDTO } from '../../dto/sandbox-instance/stages/cloud-resource-dto';
import { TerraformOutputDTO } from '../../dto/sandbox-instance/stages/terraform-output-dto';
import { inject, Injectable } from '@angular/core';
import { PortalConfig } from '@crczp/utils';
import { HttpClient } from '@angular/common/http';
import { RequestDTO } from '../../dto/sandbox-instance/request-dto';
import { AllocationOutputSort, ResourceUsageSort } from '../sorts';

/**
 * Service abstracting http communication with allocation requests endpoints.
 */
@Injectable()
export class AllocationRequestsApi {
    private readonly http = inject(HttpClient);

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
     */
    cancel(requestId: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${requestId}/cancel`, {});
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
     * Sends http request to retrieve networking ansible stage outputs
     * @param requestId id of the request associated with the networking ansible stage
     * @param pagination requested pagination
     */
    getNetworkingAnsibleOutputs(
        requestId: number,
        pagination: OffsetPaginationEvent<AllocationOutputSort>,
    ): Observable<OffsetPaginatedResource<string>> {
        return this.http
            .get<DjangoResourceDTO<AnsibleAllocationOutputDTO>>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/networking-ansible/outputs`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (resp) =>
                        new OffsetPaginatedResource<string>(
                            RequestStageMapper.fromAnsibleAllocationOutputDTOs(
                                resp.results,
                            ),
                            PaginationMapper.fromDjangoDTO(resp),
                        ),
                ),
            );
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
     * Sends http request to retrieve user ansible stage outputs
     * @param requestId id of the request associated with the user ansible stage
     * @param pagination requested pagination
     */
    getUserAnsibleOutputs(
        requestId: number,
        pagination: OffsetPaginationEvent<AllocationOutputSort>,
    ): Observable<OffsetPaginatedResource<string>> {
        return this.http
            .get<DjangoResourceDTO<AnsibleAllocationOutputDTO>>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/user-ansible/outputs`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (resp) =>
                        new OffsetPaginatedResource<string>(
                            RequestStageMapper.fromAnsibleAllocationOutputDTOs(
                                resp.results,
                            ),
                            PaginationMapper.fromDjangoDTO(resp),
                        ),
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

    /**
     * Sends http request to retrieve outputs of terraform allocation stage
     * @param requestId id of the request associated with the terraform stage
     * @param pagination requested pagination
     */
    getTerraformOutputs(
        requestId: number,
        pagination: OffsetPaginationEvent<AllocationOutputSort>,
    ): Observable<OffsetPaginatedResource<TerraformOutput>> {
        return this.http
            .get<DjangoResourceDTO<TerraformOutputDTO>>(
                `${this.apiUrl}/${requestId}/${this.stagesUriExtension}/terraform/outputs`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new OffsetPaginatedResource<TerraformOutput>(
                            RequestStageMapper.fromTerraformOutputDTOs(
                                response.results,
                            ),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }
}
