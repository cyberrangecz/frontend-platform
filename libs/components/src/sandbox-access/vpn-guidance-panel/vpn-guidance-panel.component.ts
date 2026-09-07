import { Component, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatIcon } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@crczp/utils';
import { Subject, switchMap, timer } from 'rxjs';
import { LogoSpinnerComponent } from '../../logo-spinner/logo-spinner.component';

/** How long a copied command holds its confirmation before the icon returns. */
const COPIED_FEEDBACK_MS = 1200;

/**
 * Guidance for reaching a sandbox over VPN: the client prerequisite, the command establishing the
 * connection, and the commands ending it. Every command copies to the clipboard when clicked and
 * stays selectable for copying by hand.
 */
@Component({
    selector: 'crczp-vpn-guidance-panel',
    templateUrl: './vpn-guidance-panel.component.html',
    styleUrl: './vpn-guidance-panel.component.scss',
    imports: [NgTemplateOutlet, MatIcon, LogoSpinnerComponent],
})
export class VpnGuidancePanelComponent {
    connectCommand = input<string | null>(null);
    waiting = input<boolean>(false);
    failed = input<boolean>(false);
    unavailable = input<boolean>(false);

    /** Emits when the VPN command is asked for again. */
    retry = output<void>();

    /** Emits when the panel is dismissed from within. */
    close = output<void>();

    protected readonly installDocumentationUrl =
        'https://docs.netbird.io/get-started/install';
    protected readonly disconnectCommand = 'netbird down';
    protected readonly deregisterCommand = 'netbird deregister';

    /** Command currently confirming its copy, absent while none does. */
    protected readonly copiedCommand = signal<string | null>(null);

    private readonly clipboard = inject(Clipboard);
    private readonly notificationService = inject(NotificationService);
    private readonly commandCopied$ = new Subject<void>();

    constructor() {
        this.commandCopied$
            .pipe(
                switchMap(() => timer(COPIED_FEEDBACK_MS)),
                takeUntilDestroyed(),
            )
            .subscribe(() => this.copiedCommand.set(null));
    }

    /**
     * Places a command on the clipboard, reporting the outcome as a notification and, on success,
     * on that command's own icon.
     *
     * @param command Command to place on the clipboard.
     */
    protected onCopyCommand(command: string): void {
        if (!this.clipboard.copy(command)) {
            this.notificationService.emit('error', 'Copying the command failed');
            return;
        }

        this.notificationService.emit('success', 'Command copied');
        this.copiedCommand.set(command);
        this.commandCopied$.next();
    }
}
