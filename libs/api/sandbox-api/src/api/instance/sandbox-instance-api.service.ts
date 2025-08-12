import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Lock, SandboxInstance, SandboxKeyPair, VMConsole, VMInfo, VMStatus } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';

/**
 * Service abstracting http communication with sandbox instances endpoints.
 */
export abstract class SandboxInstanceApi {
    /**
     * Sends http request to retrieve all sandbox instances of pool on specified page of a pagination
     * @param poolId id of the associated pool
     * @param pagination requested pagination
     */
    abstract getSandboxes(
        poolId: number,
        pagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<SandboxInstance>>;

    /**
     * Sends http request to retrieve sandbox instance by id
     * @param sandboxUuid id of the sandbox instance
     */
    abstract getSandbox(sandboxUuid: string): Observable<SandboxInstance>;

    /**
     * Sends http request to unlock a sandbox instance
     * @param sandboxId id of the sandbox instance to unlock
     */
    abstract unlockSandbox(sandboxId: number): Observable<any>;

    /**
     * Sends http request to lock a sandbox instance
     * @param sandboxId id of the sandbox instance to lock
     */
    abstract lockSandbox(sandboxId: number): Observable<Lock>;

    /**
     * Sends http request to get a user key-pair
     * @param sandboxId id of the sandbox instance to lock
     */
    abstract getSandboxUserKeyPair(
        sandboxId: number
    ): Observable<SandboxKeyPair>;

    /**
     * Sends http request to get locks for given sandbox
     * @param sandboxId id of the sandbox instance to lock
     * @param pagination requested pagination
     */
    abstract getSandboxLocks(
        sandboxId: number,
        pagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<Lock>>;

    /**
     * Sends http request to get specific lock for given sandbox
     * @param sandboxId id of the sandbox instance to lock
     * @param lockId id of the lock to get
     */
    abstract getSandboxLock(
        sandboxId: number,
        lockId: number
    ): Observable<Lock>;

    /**
     * Sends http request to get zip file that contains configurations, key and script for remote ssh access for user
     * @param sandboxUuid id of the sandbox for which remote ssh access is demanded
     */
    abstract getUserSshAccess(sandboxUuid: string): Observable<boolean>;

    /**
     * Sends http request to generate SSH config for user access to sandbox
     * @param sandboxId id of the sandbox
     */
    abstract getUserSSHConfig(sandboxId: number): Observable<any>;

    /**
     * Sends http request to get VM info
     * @param sandboxUuid id of the sandbox
     * @param vmName name of VM to get info for
     */
    abstract getVMInfo(sandboxUuid: string, vmName: string): Observable<VMInfo>;

    /**
     * Sends http request to update VM status
     * @param sandboxUuid id of the sandbox
     * @param vmName name of VM to get info for
     * @param newStatus new status of the VM
     */
    abstract updateVMStatus(
        sandboxUuid: string,
        vmName: string,
        newStatus: VMStatus
    ): Observable<any>;

    /**
     * Sends http request to get VM console
     * @param sandboxUuid id of the sandbox
     * @param vmName name of VM to get info for
     */
    abstract getVMConsole(
        sandboxUuid: string,
        vmName: string
    ): Observable<VMConsole>;
}
