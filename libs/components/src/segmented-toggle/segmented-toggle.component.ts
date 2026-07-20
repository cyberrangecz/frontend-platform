import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/** One selectable segment of a {@link SegmentedToggleComponent}. */
export interface SegmentedToggleOption {
    /** Value emitted when this segment is selected. */
    readonly value: string;
    /** Text shown on the segment. */
    readonly label: string;
    /** Optional Material icon ligature shown before the label. */
    readonly icon?: string;
}

/**
 * Single-select segmented control built on `mat-button-toggle-group`, styled with the
 * Material system container colors. The selected segment always uses the primary
 * container color, regardless of which segment or how many segments are present.
 */
@Component({
    selector: 'crczp-segmented-toggle',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonToggleModule, MatIconModule, MatTooltipModule],
    templateUrl: './segmented-toggle.component.html',
    styleUrl: './segmented-toggle.component.scss',
})
export class SegmentedToggleComponent {
    /** Selectable segments, in display order. */
    readonly options = input.required<readonly SegmentedToggleOption[]>();
    /** Value of the currently selected segment. */
    readonly value = input.required<string>();
    /**
     * When true, segments render their icon only and surface the label as a hover
     * tooltip and accessible name instead of visible text. Requires every option to
     * supply an icon.
     */
    readonly iconOnly = input<boolean>(false);
    /** Emits the value of a newly selected segment. */
    readonly valueChange = output<string>();
}
