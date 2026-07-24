import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { OverflowTooltipDirective } from '@crczp/utils';
import { PALETTE } from '../theme/event-type-colors';
import { AvatarStackComponent } from './avatar-stack.component';
import { DistributionBarComponent } from './distribution-bar.component';
import { AnswerCorrectness, AvatarFace, SelectionMarker } from './answer-tokens';

/**
 * One answer's presentation surface, shared by every question type. It carries the
 * correctness tint, a selection marker, a projected label, the response distribution
 * bar, and the stack of trainees who chose it. The answer the focused trainee picked is
 * raised with a gold shadow. Clicking the surface emits an answer intent; clicking a face
 * emits that trainee's run id.
 */
@Component({
    selector: 'crczp-answer-surface',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, DistributionBarComponent, AvatarStackComponent, OverflowTooltipDirective],
    templateUrl: './answer-surface.component.html',
    styleUrl: './answer-surface.component.scss',
})
export class AnswerSurfaceComponent {
    /** Correctness classification driving the tint and text pill. */
    readonly correctness = input.required<AnswerCorrectness>();

    /** Selection control shape shown at the leading edge. */
    readonly marker = input.required<SelectionMarker>();

    /** Arrangement of the surface's parts: an inline row or a stacked matrix cell. */
    readonly layout = input<'row' | 'cell'>('row');

    /** Whether the marker renders in its filled (selected) state. */
    readonly markerFilled = input<boolean>(false);

    /** Whether the focused trainee chose this answer, raising it with the gold shadow. */
    readonly focusedTraineeChose = input<boolean>(false);

    /** Number of respondents who chose this answer. */
    readonly count = input.required<number>();

    /** This answer's share of the question's respondents, in the range 0 to 100. */
    readonly percent = input.required<number>();

    /** Faces of the trainees who chose this answer. */
    readonly faces = input.required<readonly AvatarFace[]>();

    /** Emits when the answer surface itself is activated. */
    readonly answerClick = output<void>();

    /** Emits the training run id of a clicked face. */
    readonly faceClick = output<number>();

    /** Shadow colour of the focused trainee's raised answer. */
    protected readonly traineeHighlightColor = PALETTE.gold.color;

    /** Material icon name for the current marker shape and filled state. */
    protected readonly markerIcon = computed<string>(() => {
        const filled = this.markerFilled();
        return this.marker() === 'checkbox'
            ? filled
                ? 'check_box'
                : 'check_box_outline_blank'
            : filled
              ? 'radio_button_checked'
              : 'radio_button_unchecked';
    });

    /** Soft background tint for the current correctness, or null when neutral. */
    protected readonly tintBackground = computed<string | null>(() => {
        switch (this.correctness()) {
            case 'correct':
                return PALETTE.green.bgColor;
            case 'incorrect':
                return PALETTE.red.bgColor;
            case 'neutral':
                return null;
        }
    });
}
