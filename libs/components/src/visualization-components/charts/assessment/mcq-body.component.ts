import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AnswerSurfaceComponent } from '../shared';
import { AnswerRowView, toAnswerRow } from './answer-faces';
import { answerKeys } from './answer-highlight';
import { McqQuestionVm } from './assessment-view.model';
import { correctnessTint, QuestionBodyBase } from './question-body-base';

/** One MCQ option prepared for an answer surface. */
interface McqRow extends AnswerRowView {
    /** Option order; the stable track key. */
    readonly order: number;
    /** Stable highlight key of this option across the view. */
    readonly key: string;
    /** Option label. */
    readonly text: string;
}

/**
 * Multiple-choice body: a vertical stack of answer surfaces, one per definition
 * option so unchosen options still appear. When scored, every option in the correct
 * set reads correct and the rest incorrect — shown even at zero count; a QUIZ shows
 * every option neutral. The focused trainee's own picks are marked and ringed in gold.
 */
@Component({
    selector: 'crczp-mcq-body',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AnswerSurfaceComponent],
    templateUrl: './mcq-body.component.html',
    styleUrl: './mcq-body.component.scss',
})
export class McqBodyComponent extends QuestionBodyBase {
    /** The multiple-choice question to render. */
    readonly question = input.required<McqQuestionVm>();

    /** Option rows prepared for the answer surfaces. */
    protected readonly rows = computed<readonly McqRow[]>(() => {
        const context = this.context();
        const questionId = this.question().id;
        return this.question().options.map((option) => ({
            order: option.order,
            key: answerKeys.mcq(questionId, option.order),
            text: option.text,
            ...toAnswerRow(option.distribution, correctnessTint(context.scored, option.correct), context),
        }));
    });
}
