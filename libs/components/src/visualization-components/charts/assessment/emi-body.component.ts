import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OverflowTooltipDirective } from '@crczp/utils';
import { AnswerSurfaceComponent } from '../shared';
import { AnswerRowView, QuestionBodyContext, toAnswerRow } from './answer-faces';
import { answerKeys } from './answer-highlight';
import { EmiQuestionVm, EmiStatementVm } from './assessment-view.model';
import { correctnessTint, QuestionBodyBase } from './question-body-base';

/** Width of the left label column: fits the longest label, but never wider than 160px. */
const LABEL_COLUMN = 'fit-content(160px)';

/** Width of each answer column: at least 7rem, then grows to fill the row evenly. */
const OPTION_COLUMN = 'minmax(7rem, 1fr)';

/** One matrix cell prepared for an answer surface. */
interface EmiCellView extends AnswerRowView {
    /** Order of the option this cell represents; the stable track key. */
    readonly optionOrder: number;
    /** Stable highlight key of this cell across the view. */
    readonly key: string;
}

/** One matrix row: a sub-prompt label and its per-option cells. */
interface EmiRowView {
    /** Statement order; the stable row key. */
    readonly order: number;
    /** Sub-prompt label. */
    readonly text: string;
    /** One cell per shared option, aligned to the column order. */
    readonly cells: readonly EmiCellView[];
}

/**
 * Extended-matching body: a matrix of sub-prompt rows against shared option
 * columns. Each cell is an answer surface; when scored, the cell whose option
 * correctly matches the row reads correct and the rest incorrect — shown even at
 * zero count — while a QUIZ shows every cell neutral. The focused trainee's own match
 * in each row is marked and ringed in gold. The matrix scrolls horizontally with the
 * sub-prompt label column pinned.
 */
@Component({
    selector: 'crczp-emi-body',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AnswerSurfaceComponent, OverflowTooltipDirective],
    templateUrl: './emi-body.component.html',
    styleUrl: './emi-body.component.scss',
})
export class EmiBodyComponent extends QuestionBodyBase {
    /** The extended-matching question to render. */
    readonly question = input.required<EmiQuestionVm>();

    /** Shared option columns, in option order. */
    protected readonly columns = computed(() => this.question().options);

    /** Grid track template: a pinned label column plus one track per option. */
    protected readonly gridTemplateColumns = computed<string>(
        () => `${LABEL_COLUMN} repeat(${this.columns().length}, ${OPTION_COLUMN})`,
    );

    /** Matrix rows prepared for the answer surfaces. */
    protected readonly rows = computed<readonly EmiRowView[]>(() => {
        const context = this.context();
        const questionId = this.question().id;
        return this.question().statements.map((statement) => this.toRowView(statement, questionId, context));
    });

    /**
     * Builds one matrix row view from a statement, projecting each of its cells
     * into an answer surface row.
     *
     * @param statement The sub-prompt and its per-option cells.
     * @param questionId Id of the owning question, for cell key derivation.
     * @param context The trainee lookup and focused-trainee selection shared by every question body.
     * @returns The row's label and its prepared cells.
     */
    private toRowView(statement: EmiStatementVm, questionId: number, context: QuestionBodyContext): EmiRowView {
        return {
            order: statement.order,
            text: statement.text,
            cells: statement.cells.map((cell) => ({
                optionOrder: cell.optionOrder,
                key: answerKeys.emi(questionId, statement.order, cell.optionOrder),
                ...toAnswerRow(
                    cell.distribution,
                    correctnessTint(context.scored, cell.optionOrder === statement.correctOptionOrder),
                    context,
                ),
            })),
        };
    }
}
