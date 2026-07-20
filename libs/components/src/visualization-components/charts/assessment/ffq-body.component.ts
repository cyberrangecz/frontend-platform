import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Utils } from '@crczp/utils';
import { AnswerCorrectness, AnswerSurfaceComponent } from '../shared';
import { AnswerRowView, QuestionBodyContext, toAnswerRow } from './answer-faces';
import { answerKeys } from './answer-highlight';
import { FfqAnswerVm, FfqQuestionVm } from './assessment-view.model';
import { QuestionBodyBase } from './question-body-base';

/**
 * Orders answers by descending chooser count, for the unscored QUIZ neutral list.
 *
 * @param first First answer to compare.
 * @param second Second answer to compare.
 * @returns Negative when `first` was chosen more often than `second`, positive when fewer, zero when equal.
 */
const byChooserCountDesc = (first: FfqAnswerVm, second: FfqAnswerVm): number =>
    second.distribution.count - first.distribution.count;

/** One distinct free-form answer prepared for an answer surface. */
interface FfqRowView extends AnswerRowView {
    /** The verbatim answer text; the stable track key. */
    readonly text: string;
    /** Stable highlight key of this answer across the view. */
    readonly key: string;
}

/** One rendered section of grouped answers with its headline counts. */
interface FfqSection {
    /** Section heading; also the stable section key. */
    readonly heading: string;
    /** Whether the section's list scrolls within a bounded height. */
    readonly scroll: boolean;
    /** Answer rows, the focused trainee's own answer floated to the top. */
    readonly rows: readonly FfqRowView[];
    /** Number of distinct answer strings in the section. */
    readonly distinctCount: number;
    /** Number of trainees represented across the section. */
    readonly traineeCount: number;
}

/**
 * Builds a rendered section from grouped answers, floating the focused trainee's own
 * answer to the top while preserving the incoming order of the rest.
 *
 * The headline counts reflect only the answers matching the filter. A section with no
 * answers at all (before filtering) is dropped entirely rather than rendered empty.
 *
 * @param questionId The owning question id, for the answers' highlight keys.
 * @param heading The section heading.
 * @param scroll Whether the section's list scrolls within a bounded height.
 * @param answers The distinct grouped answers of the section, in their display order.
 * @param correctness Correctness tint applied to every row of the section.
 * @param context The trainee lookup and focused-trainee selection the faces resolve against.
 * @param term Lower-cased filter term; empty renders every answer.
 * @returns The matching rows plus their distinct-answer and trainee counts, or `null` when the section has no answers at all.
 */
function buildSection(
    questionId: number,
    heading: string,
    scroll: boolean,
    answers: readonly FfqAnswerVm[],
    correctness: AnswerCorrectness,
    context: QuestionBodyContext,
    term: string,
): FfqSection | null {
    if (answers.length === 0) {
        return null;
    }
    const matching = term === '' ? answers : answers.filter((answer) => Utils.String.searchSubstring(answer.text, term));
    const rows = matching.map(
        (answer): FfqRowView => ({
            text: answer.text,
            key: answerKeys.ffq(questionId, answer.text),
            ...toAnswerRow(answer.distribution, correctness, context),
        }),
    );
    const focused = rows.filter((row) => row.focusedTraineeChose);
    const rest = rows.filter((row) => !row.focusedTraineeChose);
    return {
        heading,
        scroll,
        rows: [...focused, ...rest],
        distinctCount: matching.length,
        traineeCount: matching.reduce((sum, answer) => sum + answer.distribution.count, 0),
    };
}

/**
 * Free-form body: verbatim-grouped typed answers. When scored, the full correct set
 * (including members nobody typed) is pinned above a scrollable incorrect section;
 * a QUIZ shows a single neutral list of every distinct typed answer, ordered by count.
 * In every case the focused trainee's own answer floats to the top of its section.
 */
@Component({
    selector: 'crczp-ffq-body',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AnswerSurfaceComponent, FormsModule, MatFormFieldModule, MatIconModule, MatInputModule],
    templateUrl: './ffq-body.component.html',
    styleUrl: './ffq-body.component.scss',
})
export class FfqBodyComponent extends QuestionBodyBase {
    /** The free-form question to render. */
    readonly question = input.required<FfqQuestionVm>();

    /** Case-insensitive substring the answer list is filtered by. */
    protected readonly filter = signal('');

    /** Normalised filter term; empty when no filter is applied. */
    private readonly filterTerm = computed(() => this.filter().trim().toLowerCase());

    /** The one or two answer sections to render, in display order; empty sections are dropped. */
    protected readonly sections = computed<readonly FfqSection[]>(() => {
        const context = this.context();
        const question = this.question();
        const term = this.filterTerm();
        const id = question.id;
        const sections = context.scored
            ? [
                  buildSection(id, 'Correct', false, question.correctAnswers, 'correct', context, term),
                  buildSection(id, 'Incorrect', true, question.incorrectAnswers, 'incorrect', context, term),
              ]
            : [
                  buildSection(
                      id,
                      'Answers',
                      false,
                      [...question.correctAnswers, ...question.incorrectAnswers]
                          .filter((answer) => answer.distribution.count > 0)
                          .sort(byChooserCountDesc),
                      'neutral',
                      context,
                      term,
                  ),
              ];
        return sections.filter((section): section is FfqSection => section !== null);
    });
}
