import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

type PanelPlaceholderVariant = 'empty' | 'error';

/**
 * Centered icon and message shown in a panel body when there is no chart or table to
 * render: either the query matched no data (`empty`) or loading failed (`error`).
 * Refresh is automatic, so no retry affordance is offered.
 */
@Component({
    selector: 'crczp-panel-placeholder',
    imports: [MatIconModule],
    templateUrl: './panel-placeholder.component.html',
    styleUrl: './panel-placeholder.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[class.placeholder--error]': "variant() === 'error'" },
})
export class PanelPlaceholderComponent {
    /** Non-content state to render: `empty` (query returned nothing) or `error` (load failed). */
    readonly variant = input.required<PanelPlaceholderVariant>();
    /** Overrides the default message shown for the active variant. */
    readonly message = input<string>();

    protected readonly icon = computed(() => (this.variant() === 'error' ? 'error_outline' : 'search_off'));

    protected readonly text = computed(
        () => this.message() ?? (this.variant() === 'error' ? "Couldn't load data" : 'No data to display'),
    );
}
