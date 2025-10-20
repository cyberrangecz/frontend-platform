import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ResponseHeaderContentDispositionReader } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Lock, SandboxInstance, SandboxKeyPair, VMConsole, VMInfo, VMStatus } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LockDTO } from '../../dto/sandbox-instance/lock-dto';
import { SandboxInstanceDTO } from '../../dto/sandbox-instance/sandbox-instance-dto';
import { SandboxKeyPairDTO } from '../../dto/sandbox-instance/sandbox-key-pair-dto';
import { VMInfoDTO } from '../../dto/sandbox-instance/vm-info-dto';
import { SandboxInstanceMapper } from '../../mappers/sandbox-instance/sandbox-instance-mapper';
import { LockMapper } from '../../mappers/sandbox-instance/lock-mapper';
import { SandboxKeyPairMapper } from '../../mappers/sandbox-instance/sandbox-key-pair-mapper';
import { VMConsoleMapper } from '../../mappers/sandbox-instance/vm-console-mapper';
import { VMInfoMapper } from '../../mappers/sandbox-instance/vm-info-mapper';
import { BlobFileSaver, DjangoResourceDTO, handleJsonError, PaginationMapper, ParamsBuilder } from '@crczp/api-common';
import { PortalConfig } from '@crczp/utils';
import { PoolLockSort, SandboxInstanceSort } from '../sorts';

/**
 * Service abstracting http communication with sandbox instances endpoints.
 */
@Injectable()
export class SandboxInstanceApi {
    private readonly http = inject(HttpClient);

    private readonly sandboxInstancesUriExtension = 'sandboxes';
    private readonly locksUriExtension = 'lock';
    private readonly vmsUriExtension = 'vms';

    private readonly poolsEndpointUri: string;
    private readonly sandboxEndpointUri: string;
    private readonly unitsEndpointUri: string;

    constructor() {
        const sandboxBasePath = inject(PortalConfig).basePaths.sandbox;
        this.poolsEndpointUri = `${sandboxBasePath}/pools`;
        this.sandboxEndpointUri = `${sandboxBasePath}/sandboxes`;
        this.unitsEndpointUri = `${sandboxBasePath}/SandboxInstanceDefaultApi`;
    }

    /**
     * Sends http request to retrieve all sandbox instances of pool on specified page of a pagination
     * @param poolId id of the associated pool
     * @param pagination requested pagination
     */
    getSandboxes(
        poolId: number,
        pagination: OffsetPaginationEvent<SandboxInstanceSort>,
    ): Observable<PaginatedResource<SandboxInstance>> {
        return this.http
            .get<DjangoResourceDTO<SandboxInstanceDTO>>(
                `${this.poolsEndpointUri}/${poolId}/${this.sandboxInstancesUriExtension}`,
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
     * Sends http request to retrieve sandbox instance by id
     * @param sandboxUuid id of the sandbox instance
     */
    getSandbox(sandboxUuid: string): Observable<SandboxInstance> {
        return this.http
            .get<SandboxInstanceDTO>(
                `${this.sandboxEndpointUri}/${sandboxUuid}`,
            )
            .pipe(map((response) => SandboxInstanceMapper.fromDTO(response)));
    }

    /**
     * Sends http request to unlock a sandbox instance
     * @param sandboxId id of the sandbox instance to unlock
     */
    unlockSandbox(sandboxId: number): Observable<any> {
        return this.http.delete(
            `${this.unitsEndpointUri}/${sandboxId}/${this.locksUriExtension}`,
        );
    }

    /**
     * Sends http request to lock a sandbox instance
     * @param sandboxId id of the sandbox instance to lock
     */
    lockSandbox(sandboxId: number): Observable<Lock> {
        return this.http
            .post<LockDTO>(
                `${this.unitsEndpointUri}/${sandboxId}/${this.locksUriExtension}`,
                {},
            )
            .pipe(map((response) => LockMapper.fromDTO(response)));
    }

    /**
     * Sends http request to get a user key-pair
     * @param sandboxId id of the sandbox instance to lock
     */
    getSandboxUserKeyPair(sandboxId: number): Observable<SandboxKeyPair> {
        return this.http
            .get<SandboxKeyPairDTO>(
                `${this.sandboxEndpointUri}/${sandboxId}/key-pairs/user`,
            )
            .pipe(map((response) => SandboxKeyPairMapper.fromDTO(response)));
    }

    /**
     * Sends http request to get locks for given sandbox
     * @param sandboxId id of the sandbox instance to lock
     * @param pagination requested pagination
     */
    getSandboxLocks(
        sandboxId: number,
        pagination: OffsetPaginationEvent<PoolLockSort>,
    ): Observable<PaginatedResource<Lock>> {
        return this.http
            .get<DjangoResourceDTO<LockDTO>>(
                `${this.unitsEndpointUri}/${sandboxId}/${this.locksUriExtension}`,
                {
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                },
            )
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
     * Sends http request to get specific lock for given sandbox
     * @param sandboxId id of the sandbox instance to lock
     * @param lockId id of the lock to get
     */
    getSandboxLock(sandboxId: number, lockId: number): Observable<Lock> {
        return this.http
            .get<LockDTO>(
                `${this.sandboxEndpointUri}/${sandboxId}/${this.locksUriExtension}/${lockId}`,
            )
            .pipe(map((response) => LockMapper.fromDTO(response)));
    }

    /**
     * Sends http request to get zip file that contains configurations, key and script for remote ssh access for user
     * @param sandboxUuid id of the sandbox for which remote ssh access is demanded
     */
    getUserSshAccess(sandboxUuid: string): Observable<boolean> {
        const headers = new HttpHeaders();
        headers.set('Accept', ['application/octet-stream']);
        return this.http
            .get(`${this.sandboxEndpointUri}/${sandboxUuid}/user-ssh-access`, {
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
                            'user-ssh-access.zip',
                        ),
                    );
                    return true;
                }),
            );
    }

    /**
     * Sends http request to generate SSH config for user access to sandbox
     * @param sandboxId id of the sandbox
     */
    getUserSSHConfig(sandboxId: number): Observable<any> {
        return this.http.get(
            `${this.sandboxEndpointUri}/${sandboxId}/user-ssh-config`,
        );
    }

    /**
     * Sends http request to get VM info
     * @param sandboxUuid id of the sandbox
     * @param vmName name of VM to get info for
     */
    getVMInfo(sandboxUuid: string, vmName: string): Observable<VMInfo> {
        return this.http
            .get<VMInfoDTO>(
                `${this.sandboxEndpointUri}/${sandboxUuid}/${this.vmsUriExtension}/${vmName}`,
            )
            .pipe(map((response) => VMInfoMapper.fromDTO(response)));
    }

    /**
     * Sends http request to update VM status
     * @param sandboxUuid id of the sandbox
     * @param vmName name of VM to get info for
     * @param newStatus new status of the VM
     */
    updateVMStatus(
        sandboxUuid: string,
        vmName: string,
        newStatus: VMStatus,
    ): Observable<any> {
        const param = new HttpParams().set('action', newStatus);
        return this.http.patch(
            `${this.sandboxEndpointUri}/${sandboxUuid}/${this.vmsUriExtension}/${vmName}`,
            {
                params: param,
            },
        );
    }

    /**
     * Sends http request to get VM console
     * @param sandboxUuid id of the sandbox
     * @param vmName name of VM to get info for
     */
    getVMConsole(sandboxUuid: string, vmName: string): Observable<VMConsole> {
        return this.http
            .get<VMConsole>(
                `${this.sandboxEndpointUri}/${sandboxUuid}/${this.vmsUriExtension}/${vmName}/console`,
            )
            .pipe(map((response) => VMConsoleMapper.fromDTO(response)));
    }
}
