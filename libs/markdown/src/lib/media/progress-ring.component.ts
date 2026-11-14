import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A circular download indicator drawn around an action. The arc fills with the progress; while
 * the total is unknown a short arc spins instead. Purely decorative: the accessible progress
 * stays with the caller.
 */
@Component({
    selector: 'crczp-progress-ring',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './progress-ring.component.html',
    styleUrl: './progress-ring.component.scss',
    host: {
        'aria-hidden': 'true',
        '[class.progress-ring--indeterminate]': 'progress() === null',
    },
})
export class ProgressRingComponent {
    /** Downloaded fraction from 0 to 1, or null while the total is unknown. */
    readonly progress = input.required<number | null>();

    protected readonly remaining = computed(() => 1 - (this.progress() ?? 0));
}
