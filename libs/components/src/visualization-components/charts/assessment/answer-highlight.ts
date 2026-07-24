import { AnswerDistribution, AssessmentVm } from './assessment-view.model';

/**
 * One highlightable answer resolved from the current view-model: its stable key
 * and who chose it. Rebuilt from the live model each poll so the chooser set stays
 * current while the selection (held elsewhere as the key alone) persists.
 */
export interface AnswerHighlight {
    /** Stable identity of the answer across the whole view. */
    readonly key: string;
    /** Run ids of the trainees who chose this answer. */
    readonly choosers: ReadonlySet<number>;
}

/**
 * Stable answer keys, one builder per question type. Both the question bodies and
 * the highlight index derive keys through these so a clicked answer resolves back
 * to the same index entry.
 */
export const answerKeys = {
    /** Key of an MCQ option within its question. */
    mcq: (questionId: number, optionOrder: number): string => `${questionId}:opt:${optionOrder}`,
    /** Key of an EMI cell (a sub-prompt matched to an option) within its question. */
    emi: (questionId: number, statementOrder: number, optionOrder: number): string =>
        `${questionId}:emi:${statementOrder}-${optionOrder}`,
    /** Key of an FFQ answer string within its question. */
    ffq: (questionId: number, text: string): string => `${questionId}:ffq:${text}`,
} as const;

/**
 * Renders an EMI answer as `sub-prompt → option` text.
 *
 * @param statementText The sub-prompt label.
 * @param optionText The matched option label.
 * @returns The joined answer label.
 */
export function emiAnswerLabel(statementText: string, optionText: string): string {
    return `${statementText} → ${optionText}`;
}

/**
 * Builds a highlight entry for one answer's distribution.
 *
 * @param key The answer's stable key.
 * @param distribution The answer's chooser run ids.
 * @returns The resolved highlight entry.
 */
function toHighlight(key: string, distribution: AnswerDistribution): AnswerHighlight {
    return { key, choosers: new Set(distribution.chooserRunIds) };
}

/**
 * Indexes every answer of an assessment by its stable key, so a highlighted key
 * resolves to a live chooser set against the current model.
 *
 * @param assessment The assessment whose answers are indexed.
 * @returns A map from answer key to its resolved highlight entry.
 */
export function indexAssessmentAnswers(assessment: AssessmentVm): ReadonlyMap<string, AnswerHighlight> {
    const index = new Map<string, AnswerHighlight>();
    for (const question of assessment.questions) {
        switch (question.kind) {
            case 'MCQ':
                for (const option of question.options) {
                    const key = answerKeys.mcq(question.id, option.order);
                    index.set(key, toHighlight(key, option.distribution));
                }
                break;
            case 'EMI':
                for (const statement of question.statements) {
                    for (const cell of statement.cells) {
                        const key = answerKeys.emi(question.id, statement.order, cell.optionOrder);
                        index.set(key, toHighlight(key, cell.distribution));
                    }
                }
                break;
            case 'FFQ':
                for (const answer of [...question.correctAnswers, ...question.incorrectAnswers]) {
                    const key = answerKeys.ffq(question.id, answer.text);
                    index.set(key, toHighlight(key, answer.distribution));
                }
                break;
            default: {
                const unhandled: never = question;
                void unhandled;
            }
        }
    }
    return index;
}
