/**
 * View-model contract for the assessment dashboard view.
 *
 * The model reconciles two data sources — live assessment-answer events and the
 * once-fetched training definition — into a single structure keyed by
 * assessment → question → option/statement/answer → trainee, with correctness,
 * counts, and per-trainee aggregates precomputed.
 *
 * Every assessment level of the run is reconciled at once so that switching the
 * stepper is pure filtering and a live poll never resets what the instructor is
 * looking at. UI state (selected step, focused trainee, highlight, sort, filter)
 * lives in component signals, never here; the model stays focus-agnostic and
 * exposes {@link AnswerDistribution.chooserRunIds} so components can derive
 * focused-trainee membership themselves.
 */

/** Kind of assessment: a scored TEST with negative marking, or a merely collected QUIZ. */
export type AssessmentKind = 'TEST' | 'QUIZ';

/** Identity of one trainee (run) participating in the run's assessments. */
export interface TraineeIdentity {
    /** Training run identifier; the stable key for a trainee across the view. */
    readonly runId: number;
    /** Backing user identifier. */
    readonly userId: number;
    /** Resolved display name, falling back to login then the numeric id. */
    readonly name: string;
    /** Resolved login handle; empty string when unknown. */
    readonly login: string;
    /** Resolved email; empty string when unknown. */
    readonly email: string;
    /** Raw base64 avatar picture without a data-URL prefix; empty when none. */
    readonly picture: string;
}

/**
 * How one possible answer was chosen across the group: who chose it and the
 * resulting frequency. Shared by MCQ options, EMI cells, and FFQ rows.
 */
export interface AnswerDistribution {
    /**
     * Run ids of trainees who chose this answer, in the model's trainee order.
     * Empty for an answer nobody chose, which still appears at zero count.
     */
    readonly chooserRunIds: readonly number[];
    /** Number of trainees who chose this answer ({@link chooserRunIds} length). */
    readonly count: number;
    /**
     * Fraction of question respondents who chose this answer, in `[0, 1]`.
     * Zero when the question has no respondents.
     */
    readonly percent: number;
}

/** One MCQ option row: its label, definition correctness, and distribution. */
export interface McqOptionVm {
    /** Option order; the event↔definition join key and the stable row key. */
    readonly order: number;
    /** Option label from the definition. */
    readonly text: string;
    /** Whether the option belongs to the correct set (from the definition). */
    readonly correct: boolean;
    /** How the group chose this option. */
    readonly distribution: AnswerDistribution;
}

/** One EMI column: a shared option available to every sub-prompt. */
export interface EmiOptionVm {
    /** Option order; the event↔definition join key and the stable column key. */
    readonly order: number;
    /** Option label from the definition. */
    readonly text: string;
}

/** One cell of an EMI row: how the group matched a sub-prompt to one option. */
export interface EmiCellVm {
    /** Order of the option this cell represents; the stable cell key. */
    readonly optionOrder: number;
    /** How the group matched the row's sub-prompt to this option. */
    readonly distribution: AnswerDistribution;
}

/** One EMI row: a sub-prompt, its correct option, and a cell per option. */
export interface EmiStatementVm {
    /** Statement order; the event↔definition join key and the stable row key. */
    readonly order: number;
    /** Sub-prompt label from the definition. */
    readonly text: string;
    /** Order of the option that correctly matches this sub-prompt. */
    readonly correctOptionOrder: number;
    /** One cell per shared option, aligned to the question's option order. */
    readonly cells: readonly EmiCellVm[];
}

/** One distinct FFQ answer string: its correctness and distribution. */
export interface FfqAnswerVm {
    /** The verbatim answer text; the stable row key. */
    readonly text: string;
    /** Whether this text is a member of the definition's correct-answer set. */
    readonly correct: boolean;
    /** How the group typed this exact string. */
    readonly distribution: AnswerDistribution;
}

/** Fields common to every question regardless of type. */
export interface QuestionVmBase {
    /** Question identifier; the event↔definition join key and stable key. */
    readonly id: number;
    /** Zero-based position within the assessment; the displayed question index. */
    readonly order: number;
    /** Question prompt from the definition. */
    readonly title: string;
    /** Points awarded when the whole question is correct. */
    readonly score: number;
    /** Penalty applied when the whole question is wrong (negative marking). */
    readonly penalty: number;
    /** Number of trainees who gave a non-null answer to this question. */
    readonly respondentCount: number;
}

/** Multiple-choice question: every definition option as a distribution row. */
export interface McqQuestionVm extends QuestionVmBase {
    readonly kind: 'MCQ';
    /** Orders of the options forming the correct set (all-or-nothing). */
    readonly correctOptionOrders: ReadonlySet<number>;
    /** Every option from the definition, in option order. */
    readonly options: readonly McqOptionVm[];
}

/** Extended-matching question: a sub-prompt × shared-option matrix. */
export interface EmiQuestionVm extends QuestionVmBase {
    readonly kind: 'EMI';
    /** Shared options forming the matrix columns, in option order. */
    readonly options: readonly EmiOptionVm[];
    /** Sub-prompts forming the matrix rows, in statement order. */
    readonly statements: readonly EmiStatementVm[];
}

/** Free-form question: verbatim-grouped answers split by correctness. */
export interface FfqQuestionVm extends QuestionVmBase {
    readonly kind: 'FFQ';
    /**
     * The full correct-answer set from the definition, including members nobody
     * typed (zero count), ordered by count descending.
     */
    readonly correctAnswers: readonly FfqAnswerVm[];
    /**
     * Distinct typed strings matching no correct member, ordered by count
     * descending.
     */
    readonly incorrectAnswers: readonly FfqAnswerVm[];
}

/** One question of an assessment, discriminated by {@link QuestionVm.kind}. */
export type QuestionVm = McqQuestionVm | EmiQuestionVm | FfqQuestionVm;

/** One trainee's answer to a single question, projected for export. */
export interface QuestionAnswerDetail {
    /** Identifier of the question this detail answers. */
    readonly questionId: number;
    /** Whether the trainee gave a non-null answer to the question. */
    readonly answered: boolean;
    /** Whether the answer scores the whole question correct under the all-or-nothing rule. */
    readonly correct: boolean;
    /** Signed points gained on the question under negative marking. */
    readonly pointsGained: number;
    /** Human-readable rendering of the trainee's selection; empty when unanswered. */
    readonly answerText: string;
}

/** One trainee's result within a single assessment. */
export interface TraineeResult {
    /** Training run identifier of the trainee this result belongs to. */
    readonly runId: number;
    /** Whether the trainee answered at least one question of the assessment. */
    readonly hasAnswered: boolean;
    /** Number of questions the trainee gave a non-null answer to. */
    readonly answeredCount: number;
    /** Sum of signed points gained across the assessment (negative marking). */
    readonly points: number;
    /** Number of whole questions the trainee answered entirely correctly. */
    readonly correctCount: number;
}

/** One assessment level, fully reconciled against the group's answers. */
export interface AssessmentVm {
    /** Level identifier from the definition; the stable key for the assessment. */
    readonly levelId: number;
    /** Zero-based position within the run's ordered assessment levels. */
    readonly order: number;
    /** Assessment title from the definition. */
    readonly title: string;
    /** Whether the assessment is scored (TEST) or merely collected (QUIZ). */
    readonly kind: AssessmentKind;
    /** Whether the assessment is scored, so points and group aggregates apply. */
    readonly scored: boolean;
    /** Number of questions in the assessment. */
    readonly questionCount: number;
    /** Every question of the assessment, in definition order. */
    readonly questions: readonly QuestionVm[];
    /** Per-trainee result, keyed by run id; only trainees with a submission. */
    readonly results: ReadonlyMap<number, TraineeResult>;
    /**
     * Per-trainee answer detail keyed by run id, one entry per question in
     * definition order; only trainees with a submission. Feeds the long-format
     * CSV export without re-deriving answers from distributions.
     */
    readonly submissions: ReadonlyMap<number, readonly QuestionAnswerDetail[]>;
    /** Maximum attainable points — the sum of every question's score. */
    readonly maxPoints: number;
    /** Number of trainees who answered at least one question (the takers). */
    readonly takerCount: number;
    /**
     * Arithmetic mean of taker scores, the group figure for the vs-group tile.
     * Zero for a QUIZ, which is never compared.
     */
    readonly groupMeanScore: number;
}

/** Root view-model feeding the whole assessment dashboard view. */
export interface AssessmentDashboardVm {
    /**
     * Every trainee with at least one assessment submission on the run, in a
     * deterministic default order (name, then run id). Components apply their
     * own sort on top.
     */
    readonly trainees: readonly TraineeIdentity[];
    /** Every assessment level of the run, in definition order. */
    readonly assessments: readonly AssessmentVm[];
}
