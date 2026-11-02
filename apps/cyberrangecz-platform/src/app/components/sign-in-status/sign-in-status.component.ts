import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Full-screen sign-in progress view built from the boot loader markup and styles of the
 * application page, so leaving for the identity provider and returning from it read as one
 * loading screen. Adds the platform version to the sidebar.
 */
@Component({
    selector: 'crczp-sign-in-status',
    templateUrl: './sign-in-status.component.html',
    styleUrl: './sign-in-status.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInStatusComponent {
    /** Platform version shown at the bottom of the sidebar, omitted when empty. */
    readonly version = input<string>();
}
