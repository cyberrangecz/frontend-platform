import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
import { RequestDTO } from '../../../dto/sandbox-instance/request-dto';
import { RequestMapper } from '../../../mappers/sandbox-instance/request-mapper';
import { SandboxApiConfigService } from '../../../others/sandbox-api-config.service';
import { AllocationRequestsApi } from './allocation-requests-api.service';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { TerraformAllocationStageDTO } from '../../../dto/sandbox-instance/stages/terraform-allocation-stage-dto';
import { RequestStageMapper } from '../../../mappers/sandbox-instance/request-stage-mapper';
import { AnsibleAllocationStageDTO } from '../../../dto/sandbox-instance/stages/ansible-allocation-stage-dto';
import { AnsibleAllocationOutputDTO } from '../../../dto/sandbox-instance/stages/ansible-allocation-output-dto';
import { TerraformOutputDTO } from '../../../dto/sandbox-instance/stages/terraform-output-dto';
import { CloudResourceDTO } from '../../../dto/sandbox-instance/stages/cloud-resource-dto';
import { DjangoResourceDTO, PaginationMapper, ParamsBuilder } from '@crczp/api-common';

/**
 * Default implementation of service abstracting http communication with allocation requests endpoints.
 */
@Injectable()
export class AllocationRequestsDefaultApi extends AllocationRequestsApi {
    private readonly allocationRequestUriExtension = 'allocation-requests';
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
        this.requestsEndpointUri = this.context.config.sandboxRestBasePath + this.allocationRequestUriExtension;
    }

    /**
     * Sends http request to get allocation request
     * @param requestId id of the request to retrieve
     */
    get(requestId: number): Observable<AllocationRequest> {
        return this.http
            .get<RequestDTO>(`${this.requestsEndpointUri}/${requestId}`)
            .pipe(map((response) => RequestMapper.fromAllocationDTO(response)));
    }

    /**
     * Sends http request to cancel allocation request
     * @param requestId id of the request to cancel
     */
    cancel(requestId: number): Observable<any> {
        return this.http.patch(`${this.requestsEndpointUri}/${requestId}/cancel`, {});
    }

    /**
     * Sends http request to retrieve networking ansible stage detail
     * @param requestId id of the request associated with the networking ansible stage
     */
    getNetworkingAnsibleStage(requestId: number): Observable<NetworkingAnsibleAllocationStage> {
        return this.http
            .get<AnsibleAllocationStageDTO>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/networking-ansible`,
            )
            .pipe(map((resp) => RequestStageMapper.fromNetworkingAnsibleAllocationDTO(resp)));
    }

    /**
     * Sends http request to retrieve networking ansible stage outputs
     * @param requestId id of the request associated with the networking ansible stage
     * @param pagination requested pagination
     */
    getNetworkingAnsibleOutputs(
        requestId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<string>> {
        return this.http
            .get<DjangoResourceDTO<AnsibleAllocationOutputDTO>>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/networking-ansible/outputs`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (resp) =>
                        new PaginatedResource<string>(
                            RequestStageMapper.fromAnsibleAllocationOutputDTOs(resp.results),
                            PaginationMapper.fromDjangoDTO(resp),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve user ansible stage detail
     * @param requestId id of the request associated with the user ansible stage
     */
    getUserAnsibleStage(requestId: number): Observable<UserAnsibleAllocationStage> {
        return this.http
            .get<AnsibleAllocationStageDTO>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/user-ansible`,
            )
            .pipe(map((resp) => RequestStageMapper.fromUserAnsibleAllocationDTO(resp)));
    }

    /**
     * Sends http request to retrieve user ansible stage outputs
     * @param requestId id of the request associated with the user ansible stage
     * @param pagination requested pagination
     */
    getUserAnsibleOutputs(requestId: number, pagination: OffsetPaginationEvent): Observable<PaginatedResource<string>> {
        return this.http
            .get<DjangoResourceDTO<AnsibleAllocationOutputDTO>>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/user-ansible/outputs`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (resp) =>
                        new PaginatedResource<string>(
                            RequestStageMapper.fromAnsibleAllocationOutputDTOs(resp.results),
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
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/terraform`,
            )
            .pipe(map((resp) => RequestStageMapper.fromTerraformAllocationDTO(resp)));
    }

    /**
     * Sends http request to retrieve resources of terraform allocation stage
     * @param requestId id of the request associated with the terraform stage
     * @param pagination requested pagination
     */
    getCloudResources(
        requestId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<CloudResource>> {
        return this.http
            .get<DjangoResourceDTO<CloudResourceDTO>>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/openstack/resources`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<CloudResource>(
                            RequestStageMapper.fromCloudResourceDTOs(response.results),
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
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<TerraformOutput>> {
        return this.http
            .get<DjangoResourceDTO<TerraformOutputDTO>>(
                `${this.requestsEndpointUri}/${requestId}/${this.stagesUriExtension}/terraform/outputs`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<TerraformOutput>(
                            RequestStageMapper.fromTerraformOutputDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }
}
