import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SandboxInstanceApi } from '@crczp/sandbox-api';
import { SandboxVpnCommand } from '@crczp/sandbox-model';
import { PortalConfig } from '@crczp/utils';
import {
    BehaviorSubject,
    defer,
    Observable,
    retry,
    shareReplay,
    tap,
    throwError,
    timer,
} from 'rxjs';

/**
 * Provides the means of reaching a sandbox, as a downloadable SSH client configuration or as a VPN
 * client command awaited through the sandbox's VPN provisioning.
 */
@Injectable()
export class SandboxAccessService {
    private readonly sandboxApi = inject(SandboxInstanceApi);
    private readonly pollingPeriod =
        inject(PortalConfig).polling.pollingPeriodLongMs;

    private readonly isLoadingSubject$ = new BehaviorSubject<boolean>(false);
    private readonly hasErrorSubject$ = new BehaviorSubject<boolean>(false);
    private readonly vpnCommandPolls = new Map<
        string,
        Observable<SandboxVpnCommand>
    >();

    /**
     * Emits true while a VPN command is being awaited.
     */
    readonly isLoading$ = this.isLoadingSubject$.asObservable();

    /**
     * Emits true once awaiting a VPN command has failed, and false again when a new wait begins.
     */
    readonly hasError$ = this.hasErrorSubject$.asObservable();

    getSshConfigFile(sandboxInstanceId: string) {
        this.sandboxApi.getUserSshAccess(sandboxInstanceId).subscribe();
    }

    /**
     * Provides the VPN command of a sandbox, waiting through the sandbox's VPN provisioning for
     * as long as the caller stays subscribed. Concurrent callers share one wait, which ends when
     * the last of them unsubscribes.
     *
     * @param sandboxUuid Sandbox whose VPN command is awaited.
     * @returns Observable emitting the command once the sandbox reports it ready.
     */
    getVpnCommand(sandboxUuid: string): Observable<SandboxVpnCommand> {
        const running = this.vpnCommandPolls.get(sandboxUuid);
        if (running) {
            return running;
        }

        const poll$ = this.createVpnCommandPoll(sandboxUuid);
        this.vpnCommandPolls.set(sandboxUuid, poll$);
        return poll$;
    }

    private createVpnCommandPoll(
        sandboxUuid: string,
    ): Observable<SandboxVpnCommand> {
        return defer(() => {
            this.isLoadingSubject$.next(true);
            this.hasErrorSubject$.next(false);
            return this.sandboxApi.getSandboxVpnCommand(sandboxUuid);
        }).pipe(
            retry({ delay: (error) => this.awaitVpnProvisioning(error) }),
            tap({
                next: () => this.isLoadingSubject$.next(false),
                error: () => {
                    this.isLoadingSubject$.next(false);
                    this.hasErrorSubject$.next(true);
                },
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
        );
    }

    /**
     * Decides whether a failed attempt is retried, waiting one polling period before it is.
     *
     * @param error Failure raised by the attempt.
     * @returns Observable delaying the next attempt, or one propagating the failure.
     */
    private awaitVpnProvisioning(error: unknown): Observable<number> {
        return error instanceof HttpErrorResponse && error.status === 425
            ? timer(this.pollingPeriod)
            : throwError(() => error);
    }
}
