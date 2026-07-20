import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { OverflowTooltipDirective } from '@crczp/utils';
import { QuestionVm } from './assessment-view.model';

/** Base fields of a question needed to render its shared header frame. */
export type QuestionHeader = Pick<QuestionVm, 'kind' | 'order' | 'title' | 'score' | 'penalty'>;

/**
 * Shared header frame for one question of any type. It shows the question index,
 * a type tag, the prompt, and — for a scored assessment — the reward and penalty;
 * the type-specific body is projected into its content slot.
 */
@Component({
    selector: 'crczp-question-frame',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OverflowTooltipDirective],
    templateUrl: './question-frame.component.html',
    styleUrl: './question-frame.component.scss',
})
export class QuestionFrameComponent {
    /** The question whose header this frame renders; only its base fields are read. */
    readonly question = input.required<QuestionHeader>();

    /** Whether the owning assessment is scored, revealing the reward and penalty. */
    readonly scored = input.required<boolean>();
}
