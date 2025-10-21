import { Observable } from 'rxjs';
import { AllocationRequest, CleanupRequest, SandboxAllocationUnit } from '@crczp/sandbox-model';
import { map } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RequestDTO } from '../../dto/sandbox-instance/request-dto';
import { SandboxAllocationUnitMapper } from '../../mappers/sandbox-instance/sandbox-allocation-unit-mapper';
import { RequestMapper } from '../../mappers/sandbox-instance/request-mapper';
import { inject, Injectable } from '@angular/core';
import { PortalConfig } from '@crczp/utils';
import { SandboxAllocationUnitDTO } from '../../dto/sandbox-instance/sandbox-allocation-unit-dto';

/**
 * Service abstracting http communication with sandbox allocation units endpoints.
 */
@Injectable()
export class SandboxAllocationUnitsApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl: string =
        inject(PortalConfig).basePaths.sandbox + '/sandbox-allocation-units';
    private readonly allocationRequestUriExtension = 'allocation-request';
    private readonly cleanupRequestUriExtension = 'cleanup-request';

    /**
     * Sends http request to retrieve sandbox allocation unit
     * @param unitId id of the sanbodx allocation unit to retrieve
     */
    get(unitId: number): Observable<SandboxAllocationUnit> {
        return this.http
            .get<SandboxAllocationUnitDTO>(`${this.apiUrl}/${unitId}`)
            .pipe(map((dto) => SandboxAllocationUnitMapper.fromDTO(dto)));
    }

    /**
     * Sends http request to update sandbox allocation unit
     * @param unit the sandbox allocation unit to update
     */
    update(unit: SandboxAllocationUnit): Observable<SandboxAllocationUnit> {
        const updateSAUnitDTO = SandboxAllocationUnitMapper.toUpdateDTO(unit);
        return this.http
            .patch<SandboxAllocationUnitDTO>(
                `${this.apiUrl}/${unit.id}`,
                updateSAUnitDTO
            )
            .pipe(map((dto) => SandboxAllocationUnitMapper.fromDTO(dto)));
    }

    /**
     * Sends http request to retrieve allocation request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with allocation request
     */
    getAllocationRequest(unitId: number): Observable<AllocationRequest> {
        return this.http
            .get<RequestDTO>(
                `${this.apiUrl}/${unitId}/${this.allocationRequestUriExtension}`
            )
            .pipe(map((dto) => RequestMapper.fromAllocationDTO(dto)));
    }

    /**
     * Sends http request to retry allocation request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with allocation request
     */
    createRetryRequest(unitId: number): Observable<SandboxAllocationUnit> {
        const param = new HttpParams();
        return this.http
            .patch<SandboxAllocationUnitDTO>(
                `${this.apiUrl}/${unitId}/allocation-stages/restart`,
                {
                    params: param,
                }
            )
            .pipe(map((dto) => SandboxAllocationUnitMapper.fromDTO(dto)));
    }

    /**
     * Sends http request to retrieve cleanup request associated with the sandbox allocation unit
     * @param unitId id of sandbox allocation unit associated with cleanup request
     */
    getCleanupRequest(unitId: number): Observable<CleanupRequest> {
        return this.http
            .get<RequestDTO>(
                `${this.apiUrl}/${unitId}/${this.cleanupRequestUriExtension}`
            )
            .pipe(map((dto) => RequestMapper.fromCleanupDTO(dto)));
    }

    /**
     * Sends http request to create cleanup request
     * @param unitId sandbox allocation unit id of to create cleanup request for
     */
    createCleanupRequest(unitId: number): Observable<CleanupRequest> {
        const params = new HttpParams().append('force', 'true');
        return this.http
            .post<RequestDTO>(
                `${this.apiUrl}/${unitId}/${this.cleanupRequestUriExtension}`,
                {},
                { params }
            )
            .pipe(map((dto) => RequestMapper.fromCleanupDTO(dto)));
    }

    /**
     * Sends http request to delete cleanup request
     * @param unitId sandbox allocation unit id of the cleanup request to delete
     */
    deleteCleanupRequest(unitId: number): Observable<any> {
        return this.http.delete(
            `${this.apiUrl}/${unitId}/${this.cleanupRequestUriExtension}`
        );
    }
}
