import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root harness component. Hosts a router outlet that mounts the
 * per-test pages under `apps/cyberrangecz-platform/e2e/harness/pages/`.
 * Each test page renders the production component in isolation so
 * Playwright specs can drive it without the full platform shell.
 */
@Component({
    selector: 'crczp-e2e-harness',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet],
    template: `<router-outlet />`,
    styles: [
        `
            :host {
                display: block;
                width: 100%;
                height: 100vh;
            }
        `,
    ],
})
export class HarnessComponent {}
