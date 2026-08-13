import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CACHE_CLAIM } from './single-tab-claim';

/**
 * Full-viewport screen shown to a tab that could not acquire the single-writer cache claim.
 *
 * It instructs the user to use a single tab and, once the holding tab is destroyed and this tab's
 * queued claim is granted, reloads into the originally requested route so the recovered tab boots
 * the cache as the new holder. A spinner marks the wait for the claim as ongoing.
 */
@Component({
    selector: 'crczp-cache-blocked',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, MatProgressSpinnerModule],
    templateUrl: './cache-blocked.component.html',
    styleUrl: './cache-blocked.component.scss',
})
export class CacheBlockedComponent {
    private readonly claim = inject(CACHE_CLAIM);
    private readonly route = inject(ActivatedRoute);

    constructor() {
        void this.claim.granted.then(() => this.recover());
    }

    /**
     * Reloads the document into the route this tab was originally navigating to, defaulting to the
     * application root. Only same-origin absolute paths are honored.
     */
    private recover(): void {
        const requested = this.route.snapshot.queryParamMap.get('redirect');
        const target = requested && requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
        location.assign(target);
    }
}
