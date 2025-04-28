import { SandboxAllocationUnitsApi } from './sandbox-allocation-units-api.service';
import { Injectable } from '@angular/core';
import { AllocationRequest, CleanupRequest, SandboxAllocationUnit } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SandboxApiConfigService } from '../../others/sandbox-api-config.service';
import { SandboxAllocationUnitDTO } from '../../dto/sandbox-instance/sandbox-allocation-unit-dto';
import { map } from 'rxjs/operators';
import { SandboxAllocationUnitMapper } from '../../mappers/sandbox-instance/sandbox-allocation-unit-mapper';
import { RequestDTO } from '../../dto/sandbox-instance/request-dto';
import { RequestMapper } from '../../mappers/sandbox-instance/request-mapper';

/**
 * Default implementation of service abstracting http communication with sandbox allocation units endpoints.
 */
@Injectable()
export class SandboxAllocationUnitsDefaultApi extends SandboxAllocationUnitsApi {
    private readonly sandboxAllocationUnitsUriExtension = 'sandbox-allocation-units';
    private readonly allocationRequestUriExtension = 'allocation-request';
    private readonly cleanupRequestUriExtension = 'cleanup-request';

    private sauEndpointUri: string;

    constructor(
        private http: HttpClient,
        private context: SandboxApiConfigService
    ) {
        super();
        if (this.context.config === undefined || this.context.config === null) {
            throw new Error(
                'SandboxApiConfig is null or undefined. Please provide it in forRoot() method of SandboxApiModule' +
                ' or provide own implementation of API services'
            );
        }
        this.sauEndpointUri = this.context.config.sandboxRestBasePath + this.sandboxAllocationUnitsUriExtension;
    }

    /**
     * Sends http request to retrieve sandbox allocation unit
     * @param unitId id of the sanbodx allocation unit to retrieve
     */
    get(unitId: number): Observable<SandboxAllocationUnit> {
        return this.http
            .get<SandboxAllocationUnitDTO>(`${this.sauEndpointUri}/${unitId}`)
            .pipe(map((dto) => SandboxAllocationUnitMapper.fromDTO(dto)));
    }

    /**
     * Sends http request to update sandbox allocation unit
     * @param unit the sandbox allocation unit to update
     */
    update(unit: SandboxAllocationUnit): Observable<SandboxAllocationUnit> {
        const updateSAUnitDTO = SandboxAllocationUnitMapper.toUpdateDTO(unit);
        return this.http
            .patch<SandboxAllocationUnitDTO>(`${this.sauEndpointUri}/${unit.id}`, updateSAUnitDTO)
            .pipe(map((dto) => SandboxAllocationUnitMapper.fromDTO(dto)));
    }

    /**
     * Sends http request to retrieve allocation request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with allocation request
     */
    getAllocationRequest(unitId: number): Observable<AllocationRequest> {
        return this.http
            .get<RequestDTO>(`${this.sauEndpointUri}/${unitId}/${this.allocationRequestUriExtension}`)
            .pipe(map((dto) => RequestMapper.fromAllocationDTO(dto)));
    }

    /**
     * Sends http request to retry allocation request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with allocation request
     */
    createRetryRequest(unitId: number): Observable<SandboxAllocationUnit> {
        const param = new HttpParams();
        return this.http
            .patch<SandboxAllocationUnitDTO>(`${this.sauEndpointUri}/${unitId}/allocation-stages/restart`, {
                params: param
            })
            .pipe(map((dto) => SandboxAllocationUnitMapper.fromDTO(dto)));
    }

    /**
     * Sends http request to retrieve cleanup request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with cleanup request
     */
    getCleanupRequest(unitId: number): Observable<CleanupRequest> {
        return this.http
            .get<RequestDTO>(`${this.sauEndpointUri}/${unitId}/${this.cleanupRequestUriExtension}`)
            .pipe(map((dto) => RequestMapper.fromCleanupDTO(dto)));
    }

    /**
     * Sends http request to create cleanup request
     * @param unitId sandbox allocation unit id of to create cleanup request for
     */
    createCleanupRequest(unitId: number): Observable<CleanupRequest> {
        const params = new HttpParams().append('force', 'true');
        return this.http
            .post<RequestDTO>(`${this.sauEndpointUri}/${unitId}/${this.cleanupRequestUriExtension}`, {}, { params })
            .pipe(map((dto) => RequestMapper.fromCleanupDTO(dto)));
    }

    /**
     * Sends http request to delete cleanup request
     * @param unitId sandbox allocation unit id of the cleanup request to delete
     */
    deleteCleanupRequest(unitId: number): Observable<any> {
        return this.http.delete(`${this.sauEndpointUri}/${unitId}/${this.cleanupRequestUriExtension}`);
    }
}
