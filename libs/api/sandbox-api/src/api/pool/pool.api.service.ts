import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ResponseHeaderContentDispositionReader } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import {
    AllocationRequest,
    CleanupRequest,
    Lock,
    Pool,
    Request,
    SandboxAllocationUnit,
    SandboxDefinition,
    SandboxInstance,
    SandboxKeyPair
} from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SandboxDefinitionDTO } from '../../dto/sandbox-definition/sandbox-definition-dto';
import { LockDTO } from '../../dto/sandbox-instance/lock-dto';
import { PoolDTO } from '../../dto/sandbox-instance/pool-dto';
import { SandboxAllocationUnitDTO } from '../../dto/sandbox-instance/sandbox-allocation-unit-dto';
import { SandboxInstanceDTO } from '../../dto/sandbox-instance/sandbox-instance-dto';
import { SandboxKeyPairDTO } from '../../dto/sandbox-instance/sandbox-key-pair-dto';
import { LockMapper } from '../../mappers/sandbox-instance/lock-mapper';
import { PoolMapper } from '../../mappers/sandbox-instance/pool-mapper';
import { SandboxKeyPairMapper } from '../../mappers/sandbox-instance/sandbox-key-pair-mapper';
import { SandboxDefinitionMapper } from '../../mappers/sandbox-definition/sandbox-definition-mapper';
import { SandboxAllocationUnitMapper } from '../../mappers/sandbox-instance/sandbox-allocation-unit-mapper';
import { SandboxInstanceMapper } from '../../mappers/sandbox-instance/sandbox-instance-mapper';
import { RequestDTO } from '../../dto/sandbox-instance/request-dto';
import { RequestMapper } from '../../mappers/sandbox-instance/request-mapper';
import { BlobFileSaver, DjangoResourceDTO, handleJsonError, PaginationMapper, ParamsBuilder } from '@crczp/api-common';
import { PortalConfig } from '@crczp/utils';
import { AllocationRequestSort, PoolSort, SandboxDefinitionSort } from '../sorts';

/**
 * Service abstracting http communication with pools endpoints.
 */
@Injectable()
export class PoolApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = inject(PortalConfig).basePaths.sandbox + '/pools';
    private readonly sandboxAllocationUnitsUriExtension =
        'sandbox-allocation-units';
    private readonly locksUriExtension = 'locks';
    private readonly sandboxInstancesUriExtension = 'sandboxes';
    private readonly allocationRequestUriExtension = 'allocation-requests';
    private readonly cleanupRequestUriExtension = 'cleanup-requests';

    /**
     * Sends http request to retrieve all pools on specified page of a pagination
     * @param pagination requested pagination
     */
    getPools(
        pagination: OffsetPaginationEvent<PoolSort>,
    ): Observable<PaginatedResource<Pool>> {
        return this.http
            .get<DjangoResourceDTO<PoolDTO>>(this.apiUrl, {
                params: ParamsBuilder.djangoPaginationParams(pagination),
            })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<Pool>(
                            PoolMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve pool by id
     * @param poolId id of the pool
     */
    getPool(poolId: number): Observable<Pool> {
        return this.http
            .get<PoolDTO>(`${this.apiUrl}/${poolId}`)
            .pipe(map((response) => PoolMapper.fromDTO(response)));
    }

    /**
     * Sends http request to delete a pool
     * @param poolId id of the pool to delete
     */
    deletePool(poolId: number, force: boolean): Observable<any> {
        let params = new HttpParams();
        if (force) {
            params = new HttpParams().set('force', force.toString());
        }
        return this.http.delete(`${this.apiUrl}/${poolId}`, {
            params,
        });
    }

    /**
     * Sends http request to clear a pool (delete all associated sandbox instances, requests etc.)
     * @param poolId id of the pool to clear
     */
    clearPool(poolId: number): Observable<any> {
        return this.http.delete(
            `${this.apiUrl}/${poolId}/${this.sandboxAllocationUnitsUriExtension}`,
        );
    }

    /**
     * Sends http request to create a pool
     */
    createPool(pool: Pool): Observable<Pool> {
        const createPoolDTO = PoolMapper.toCreateDTO(pool);
        return this.http
            .post<PoolDTO>(this.apiUrl, createPoolDTO)
            .pipe(map((dto) => PoolMapper.fromDTO(dto)));
    }

    /**
     * Sends http request to allocate sandbox instances in a pool
     * @param poolId id of the pool in which sandbox instances should be allocated
     * @param count number of sandbox instance that should be allocated
     */
    allocateSandboxes(poolId: number, count = 0): Observable<any> {
        let params = new HttpParams();
        if (count > 0) {
            params = new HttpParams().set('count', count.toString());
        }
        return this.http.post<DjangoResourceDTO<RequestDTO>>(
            `${this.apiUrl}/${poolId}/${this.sandboxAllocationUnitsUriExtension}`,
            null,
            {
                params,
            },
        );
    }

    /**
     * Sends http request to retrieve all allocation requests associated with a pool
     * @param poolId id of the allocation unit
     * @param pagination requested pagination
     */
    getAllocationRequests(
        poolId: number,
        pagination: OffsetPaginationEvent<AllocationRequestSort>,
    ): Observable<PaginatedResource<AllocationRequest>> {
        return this.http
            .get<DjangoResourceDTO<RequestDTO>>(
                `${this.apiUrl}/${poolId}/${this.allocationRequestUriExtension}`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<Request>(
                            RequestMapper.fromAllocationDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve all cleanup requests associated with a pool
     * @param poolId id of the associated pool
     * @param pagination requested pagination
     */
    getCleanupRequests(
        poolId: number,
        pagination: OffsetPaginationEvent<AllocationRequestSort>,
    ): Observable<PaginatedResource<CleanupRequest>> {
        return this.http
            .get<DjangoResourceDTO<RequestDTO>>(
                `${this.apiUrl}/${poolId}/${this.cleanupRequestUriExtension}`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<Request>(
                            RequestMapper.fromCleanupDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }

    /**
     * Sends http request to lock pool
     * @param poolId id of a pool to lock
     * @param trainingAccessToken the training access token
     */
    lockPool(poolId: number, trainingAccessToken: string): Observable<Lock> {
        const body = {
            training_access_token: trainingAccessToken,
        };

        return this.http
            .post<LockDTO>(
                `${this.apiUrl}/${poolId}/${this.locksUriExtension}`,
                body,
            )
            .pipe(map((response) => LockMapper.fromDTO(response)));
    }

    /**
     * Sends http request to unlock pool
     * @param poolId id of pool to unlock
     * @param lockId id of current lock
     */
    unlockPool(poolId: number, lockId: number): Observable<any> {
        return this.http.delete(
            `${this.apiUrl}/${poolId}/${this.locksUriExtension}/${lockId}`,
        );
    }

    /**
     * Sends http request to retrieve definition for pool
     * @param poolId id of pool
     * @param pagination requested pagination
     */
    getDefinition(
        poolId: number,
        pagination?: OffsetPaginationEvent<SandboxDefinitionSort>,
    ): Observable<PaginatedResource<SandboxDefinition>> {
        return this.http
            .get<DjangoResourceDTO<SandboxDefinitionDTO>>(
                `${this.apiUrl}/${poolId}/definition`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<SandboxDefinition>(
                            SandboxDefinitionMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve sandbox key-pair for pool
     * @param poolId id of pool
     */
    getSandboxKeyPair(poolId: number): Observable<SandboxKeyPair> {
        return this.http
            .get<SandboxKeyPairDTO>(
                `${this.apiUrl}/${poolId}/key-pairs/management`,
            )
            .pipe(map((response) => SandboxKeyPairMapper.fromDTO(response)));
    }

    /**
     * Sends http request to get locks for pool
     * @param poolId id of a pool
     */
    getPoolsLocks(poolId: number): Observable<PaginatedResource<Lock>> {
        return this.http
            .get<
                DjangoResourceDTO<LockDTO>
            >(`${this.apiUrl}/${poolId}/${this.locksUriExtension}`)
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<Lock>(
                            LockMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }

    /**
     * Sends http request to get specific lock for pool
     * @param poolId id of a pool
     * @param lockId id of a lock
     */
    getPoolsSpecificLock(poolId: number, lockId: number): Observable<Lock> {
        return this.http
            .get<LockDTO>(
                `${this.apiUrl}/${poolId}/${this.locksUriExtension}/${lockId}`,
            )
            .pipe(map((response) => LockMapper.fromDTO(response)));
    }

    /**
     * Sends http request to get sandbox allocation units for pool
     * @param poolId id of a pool
     * @param pagination a requested pagination
     */
    getPoolsSandboxAllocationUnits(
        poolId: number,
        pagination?: OffsetPaginationEvent<string>,
    ): Observable<PaginatedResource<SandboxAllocationUnit>> {
        if (pagination && pagination.sort) {
            pagination.sort = pagination.sort.replace('allocation_unit__', '');
        }
        return this.http
            .get<DjangoResourceDTO<SandboxAllocationUnitDTO>>(
                `${this.apiUrl}/${poolId}/${this.sandboxAllocationUnitsUriExtension}`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<SandboxAllocationUnit>(
                            SandboxAllocationUnitMapper.fromDTOs(
                                response.results,
                            ),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }

    /**
     * Sends http request to get unlocked sandbox in given pool and lock it
     * @param poolId id of a pool
     * @param trainingAccessToken the training access token
     */
    getSandboxAndLockIt(
        poolId: number,
        trainingAccessToken: string,
    ): Observable<SandboxInstance> {
        return this.http
            .get<SandboxInstanceDTO>(
                `${this.apiUrl}/${poolId}/${this.sandboxInstancesUriExtension}/get-and-lock/${trainingAccessToken}`,
            )
            .pipe(map((response) => SandboxInstanceMapper.fromDTO(response)));
    }

    /**
     * Sends http request to get zip file that contains configurations, key and script for remote ssh access for management
     * @param poolId id of a pool
     */
    getManagementSshAccess(poolId: number): Observable<boolean> {
        const headers = new HttpHeaders();
        headers.set('Accept', ['application/octet-stream']);
        return this.http
            .get(`${this.apiUrl}/${poolId}/management-ssh-access`, {
                responseType: 'blob',
                observe: 'response',
                headers,
            })
            .pipe(
                handleJsonError(),
                map((resp) => {
                    BlobFileSaver.saveBlob(
                        resp.body,
                        ResponseHeaderContentDispositionReader.getFilenameFromResponse(
                            resp,
                            'management-ssh-access.zip',
                        ),
                    );
                    return true;
                }),
            );
    }

    /**
     * Sends http request to get all sandboxes of the given pool.
     * @param poolId id of a pool
     * @param pagination a requested pagination
     */
    getPoolsSandboxes(
        poolId: number,
        pagination?: OffsetPaginationEvent<string>,
    ): Observable<PaginatedResource<SandboxInstance>> {
        if (
            pagination &&
            pagination.sort &&
            !pagination.sort.startsWith('allocation_unit')
        ) {
            pagination.sort = `allocation_unit_${pagination.sort}`;
        }
        return this.http
            .get<DjangoResourceDTO<SandboxInstanceDTO>>(
                `${this.apiUrl}/${poolId}/sandboxes`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<SandboxInstance>(
                            SandboxInstanceMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response),
                        ),
                ),
            );
    }

    /**
     * Sends http request to create cleanup requests for all allocation units in the given pool specified by @poolId
     * @param poolId id of a pool
     * @param force states whether the delete action should be forced
     */
    createMultipleCleanupRequests(
        poolId: number,
        force = false,
    ): Observable<any> {
        const params = new HttpParams().append('force', force.toString());
        return this.http.post(
            `${this.apiUrl}/${poolId}/cleanup-requests`,
            {},
            { params },
        );
    }

    /**
     * Sends http request to create cleanup requests for all unlocked allocation units in the given pool specified by @poolId
     * @param poolId id of a pool
     * @param force states whether the delete action should be forced
     */
    createUnlockedCleanupRequests(
        poolId: number,
        force = false,
    ): Observable<any> {
        const params = new HttpParams().append('force', force.toString());
        return this.http.post(
            `${this.apiUrl}/${poolId}/cleanup-unlocked`,
            {},
            { params },
        );
    }

    /**
     * Sends http request to create cleanup requests for all failed allocation units in the given pool specified by @poolId
     * @param poolId id of a pool
     * @param force states whether the delete action should be forced
     */
    createFailedCleanupRequests(
        poolId: number,
        force = false,
    ): Observable<any> {
        const params = new HttpParams().append('force', force.toString());
        return this.http.post(
            `${this.apiUrl}/${poolId}/cleanup-failed`,
            {},
            { params },
        );
    }

    /**
     * Sends http request to update the pool properties
     * @param pool pool to update
     */
    updatePool(pool: Pool): Observable<Pool> {
        const updatePoolDTO = PoolMapper.toUpdateDTO(pool);
        return this.http
            .patch<PoolDTO>(`${this.apiUrl}/${pool.id}`, updatePoolDTO)
            .pipe(map((dto) => PoolMapper.fromDTO(dto)));
    }
}
