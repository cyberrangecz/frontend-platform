import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    ConnectedPosition,
} from '@angular/cdk/overlay';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { SandboxAccessService } from './sandbox-access.service';
import { VpnGuidancePanelComponent } from './vpn-guidance-panel/vpn-guidance-panel.component';

/**
 * Actions reaching a sandbox: a download of its SSH client configuration, and a panel guiding the
 * way through connecting to it over VPN.
 */
@Component({
    selector: 'crczp-sandbox-access-actions',
    templateUrl: './sandbox-access-actions.component.html',
    styleUrl: './sandbox-access-actions.component.scss',
    imports: [
        MatIcon,
        MatTooltip,
        CdkOverlayOrigin,
        CdkConnectedOverlay,
        VpnGuidancePanelComponent,
    ],
    providers: [SandboxAccessService],
})
export class SandboxAccessActionsComponent {
    sandboxUuid = input.required<string>();

    protected readonly vpnPanelOpen = signal<boolean>(false);
    protected readonly vpnConnectCommand = signal<string | null>(null);
    protected readonly vpnUnavailable = signal<boolean>(false);

    /**
     * Places the panel flush against the trigger, flipping above it where the space below falls
     * short.
     */
    protected readonly vpnPanelPositions: ConnectedPosition[] = [
        {
            originX: 'center',
            originY: 'bottom',
            overlayX: 'center',
            overlayY: 'top',
        },
        {
            originX: 'center',
            originY: 'top',
            overlayX: 'center',
            overlayY: 'bottom',
        },
    ];

    private readonly accessService = inject(SandboxAccessService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly vpnPanelClosed$ = new Subject<void>();

    protected readonly vpnWaiting = toSignal(this.accessService.isLoading$, {
        initialValue: false,
    });
    protected readonly vpnFailed = toSignal(this.accessService.hasError$, {
        initialValue: false,
    });
    protected readonly vpnProvisioning = toSignal(
        this.accessService.isProvisioning$,
        { initialValue: false },
    );

    protected onSshConfigRequested(): void {
        this.accessService.getSshConfigFile(this.sandboxUuid());
    }

    /**
     * Opens the panel guiding the way through reaching the sandbox over VPN and starts awaiting
     * the sandbox's VPN command. Closes the panel instead where it already stands open.
     */
    protected onVpnCommandRequested(): void {
        if (this.vpnPanelOpen()) {
            this.closeVpnPanel();
            return;
        }

        this.vpnPanelOpen.set(true);
        this.awaitVpnCommand();
    }

    protected onVpnRetryRequested(): void {
        this.awaitVpnCommand();
    }

    protected closeVpnPanel(): void {
        this.vpnPanelOpen.set(false);
        this.vpnPanelClosed$.next();
    }

    /**
     * Subscribes to the sandbox's VPN command, holding the subscription only while the panel stays
     * open, since awaiting the command polls for as long as it is subscribed.
     */
    private awaitVpnCommand(): void {
        this.vpnUnavailable.set(false);
        this.accessService
            .getVpnCommand(this.sandboxUuid())
            .pipe(
                takeUntil(this.vpnPanelClosed$),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: (vpnCommand) => {
                    this.vpnConnectCommand.set(vpnCommand.command);
                    this.vpnUnavailable.set(vpnCommand.command === null);
                },
                error: () => {
                    this.vpnConnectCommand.set(null);
                    this.vpnUnavailable.set(false);
                },
            });
    }
}
