import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EventColor, PALETTE } from '../theme/event-type-colors';

/** Two-way run lifecycle state: a run is finished once it has ended, running otherwise. */
export type RunState = 'running' | 'finished';

/**
 * Compact pill showing a run's lifecycle state, coloured from the shared palette
 * (orange while running, green once finished). Shared across every dashboard panel
 * that surfaces run state.
 */
@Component({
    selector: 'crczp-run-state-chip',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './run-state-chip.component.html',
    styleUrl: './run-state-chip.component.scss',
})
export class RunStateChipComponent {
    /** Lifecycle state the chip renders. */
    readonly state = input.required<RunState>();

    /** Foreground and background colour pair for the current state. */
    protected readonly color = computed<EventColor>(() =>
        this.state() === 'finished' ? PALETTE.green : PALETTE.blue,
    );

    /** Human-readable state label. */
    protected readonly label = computed<string>(() =>
        this.state() === 'finished' ? 'Finished' : 'Running',
    );
}
