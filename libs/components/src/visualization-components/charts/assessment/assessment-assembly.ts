import {
    AssessmentLevel,
    AssessmentTypeEnum,
    ExtendedMatchingItems,
    FreeFormQuestion,
    MultipleChoiceQuestion,
    Question,
    QuestionTypeEnum,
    TrainingUser
} from '@crczp/training-model';
import { EventAnswer } from '@crczp/visualization-model';
import { Utils } from '@crczp/utils';
import { emiAnswerLabel } from './answer-highlight';
import {
    AnswerDistribution,
    AssessmentDashboardVm,
    AssessmentKind,
    AssessmentVm,
    EmiCellVm,
    EmiQuestionVm,
    FfqAnswerVm,
    FfqQuestionVm,
    McqOptionVm,
    McqQuestionVm,
    QuestionAnswerDetail,
    QuestionVm,
    QuestionVmBase,
    TraineeIdentity,
    TraineeResult
} from './assessment-view.model';

/**
 * One assessment-answer event as projected from the event cache: a single
 * trainee's latest submission for one assessment level. Mirrors the query
 * projection so the assembly stays free of any storage-layer type.
 */
export interface AssessmentAnswerRow {
    /** Training run identifier of the submitting trainee. */
    readonly training_run_id: number;
    /** Backing user identifier of the submitting trainee. */
    readonly user_ref_id: number;
    /** Training definition the submission belongs to. */
    readonly training_definition_id: number;
    /** Assessment level identifier the submission answers. */
    readonly level_id: number;
    /** Ordinal of the assessment level within the run. */
    readonly level_order: number;
    /** Unix millisecond submission timestamp. */
    readonly timestamp: number;
    /** The per-question answers carried by the submission. */
    readonly answers: readonly EventAnswer[];
}

/** Empty view-model returned when no assessment answers exist for the run. */
export const EMPTY_DASHBOARD: AssessmentDashboardVm = { trainees: [], assessments: [] };

/**
 * A reconciled question: its view-model plus a whole-question correctness test
 * that reuses the correct-answer identity computed once during reconciliation.
 */
interface QuestionAssembly {
    /** The reconciled question view-model. */
    readonly vm: QuestionVm;
    /**
     * Whether a trainee's answer scores the whole question correct, per the
     * all-or-nothing rule.
     */
    readonly isCorrect: (answer: EventAnswer) => boolean;
    /**
     * Renders a trainee's answer as human-readable text using the definition's
     * labels; empty when the answer carries no selection.
     */
    readonly describe: (answer: EventAnswer) => string;
}

/** A reconciled question paired with its definition, for result computation. */
type ScopedAssembly = QuestionAssembly & { readonly question: Question };

/**
 * Reconciles the run's assessment definition and live answer events into the
 * dashboard view-model: every assessment level joined against the group's
 * answers, with correctness, counts, denominators, and per-trainee aggregates.
 *
 * @param levels The run's assessment levels from the training definition.
 * @param rows   Latest-known assessment-answer submissions across all trainees.
 * @param users  Resolved trainee identities keyed by user id.
 * @returns The reconciled dashboard view-model.
 */
export function assembleAssessmentDashboard(
    levels: readonly AssessmentLevel[],
    rows: readonly AssessmentAnswerRow[],
    users: ReadonlyMap<number, TrainingUser>,
): AssessmentDashboardVm {
    if (rows.length === 0) {
        return EMPTY_DASHBOARD;
    }

    const trainees = buildRoster(rows, users);
    const orderIndex = new Map(trainees.map((trainee, index) => [trainee.runId, index]));
    const byLevelId = latestRowsByKey(rows, (row) => row.level_id);
    const byLevelOrder = latestRowsByKey(rows, (row) => row.level_order);

    const orderedLevels = byOrder(levels);
    const assessments = orderedLevels.map((level, index) =>
        buildAssessment(level, index, resolveLevelRows(level, byLevelId, byLevelOrder), orderIndex),
    );

    return { trainees, assessments };
}

/**
 * Builds the deterministic trainee roster: every distinct run that has any
 * assessment submission, resolved to an identity and ordered by name then id.
 *
 * @param rows  Every assessment-answer submission for the run.
 * @param users Resolved trainee identities keyed by user id.
 */
function buildRoster(
    rows: readonly AssessmentAnswerRow[],
    users: ReadonlyMap<number, TrainingUser>,
): readonly TraineeIdentity[] {
    const userIdByRun = rows.reduce((accumulated, row) => {
        if (!accumulated.has(row.training_run_id)) {
            accumulated.set(row.training_run_id, row.user_ref_id);
        }
        return accumulated;
    }, new Map<number, number>());

    const roster = [...userIdByRun.entries()].map(([runId, userId]): TraineeIdentity => {
        const user = users.get(userId);
        return {
            runId,
            userId,
            name: user?.name ?? user?.login ?? String(userId),
            login: user?.login ?? '',
            email: user?.mail ?? '',
            picture: user?.picture ?? '',
        };
    });

    return roster.sort(
        (first, second) => Utils.String.compare(first.name, second.name) || first.runId - second.runId,
    );
}

/**
 * Indexes the latest submission per (trainee, key) by timestamp, where the key
 * selects a level by identifier or by ordinal.
 *
 * @param rows      Every assessment-answer submission for the run.
 * @param keyOfRow  Extracts the grouping key (level id or level order) from a row.
 */
function latestRowsByKey(
    rows: readonly AssessmentAnswerRow[],
    keyOfRow: (row: AssessmentAnswerRow) => number,
): ReadonlyMap<number, ReadonlyMap<number, AssessmentAnswerRow>> {
    /**
     * Inserts a row into its (key, run) slot within the accumulated map,
     * keeping whichever of the existing and candidate rows has the later
     * timestamp.
     *
     * @param byKey The map being accumulated.
     * @param row   The candidate row to insert.
     */
    function insertLatest(
        byKey: Map<number, Map<number, AssessmentAnswerRow>>,
        row: AssessmentAnswerRow,
    ): Map<number, Map<number, AssessmentAnswerRow>> {
        const key = keyOfRow(row);
        const byRun = byKey.get(key) ?? new Map<number, AssessmentAnswerRow>();
        const existing = byRun.get(row.training_run_id);
        if (existing === undefined || row.timestamp >= existing.timestamp) {
            byRun.set(row.training_run_id, row);
        }
        byKey.set(key, byRun);
        return byKey;
    }

    return rows.reduce(insertLatest, new Map<number, Map<number, AssessmentAnswerRow>>());
}

/**
 * Resolves the submissions belonging to one definition level, preferring an
 * id match and falling back to the level ordinal when no id matches.
 *
 * @param level        The definition assessment level.
 * @param byLevelId    Submissions indexed by level id.
 * @param byLevelOrder Submissions indexed by level ordinal.
 */
function resolveLevelRows(
    level: AssessmentLevel,
    byLevelId: ReadonlyMap<number, ReadonlyMap<number, AssessmentAnswerRow>>,
    byLevelOrder: ReadonlyMap<number, ReadonlyMap<number, AssessmentAnswerRow>>,
): ReadonlyMap<number, AssessmentAnswerRow> {
    const byId = byLevelId.get(level.id);
    if (byId !== undefined && byId.size > 0) {
        return byId;
    }
    return byLevelOrder.get(level.order) ?? new Map<number, AssessmentAnswerRow>();
}

/**
 * Reconciles one assessment level: its questions, per-trainee results, and
 * aggregates.
 *
 * @param level      The definition assessment level.
 * @param order      Zero-based position of the level among assessments.
 * @param rowsByRun  Latest submission for this level, keyed by run id.
 * @param orderIndex Trainee order position keyed by run id.
 */
function buildAssessment(
    level: AssessmentLevel,
    order: number,
    rowsByRun: ReadonlyMap<number, AssessmentAnswerRow>,
    orderIndex: ReadonlyMap<number, number>,
): AssessmentVm {
    const kind: AssessmentKind = level.assessmentType === AssessmentTypeEnum.Test ? 'TEST' : 'QUIZ';
    const questions = byOrder(level.questions);

    const assemblies: ScopedAssembly[] = questions.map((question, index) => ({
        question,
        ...buildQuestion(question, index, rowsByRun, orderIndex),
    }));

    const submissionsByRun = [...rowsByRun].map(([runId, row]) => {
        const details = buildAnswerDetails(row, assemblies);
        return { runId, result: buildTraineeResult(runId, details), details };
    });
    const results = new Map(submissionsByRun.map(({ runId, result }) => [runId, result] as const));
    const submissions = new Map(submissionsByRun.map(({ runId, details }) => [runId, details] as const));

    const takers = [...results.values()].filter((result) => result.hasAnswered);
    const maxPoints = Utils.Array.sum(questions.map((question) => question.score));
    const groupMeanScore =
        kind === 'TEST' ? (Utils.Array.mean(takers.map((result) => result.points)) ?? 0) : 0;

    return {
        levelId: level.id,
        order,
        title: level.title,
        kind,
        scored: kind === 'TEST',
        questionCount: questions.length,
        questions: assemblies.map((assembly) => assembly.vm),
        results,
        submissions,
        maxPoints,
        takerCount: takers.length,
        groupMeanScore,
    };
}

/**
 * Dispatches question reconciliation by the question's declared type.
 *
 * @param question   The definition question.
 * @param order      Zero-based position of the question within the assessment.
 * @param rowsByRun  Latest submission for the level, keyed by run id.
 * @param orderIndex Trainee order position keyed by run id.
 */
function buildQuestion(
    question: Question,
    order: number,
    rowsByRun: ReadonlyMap<number, AssessmentAnswerRow>,
    orderIndex: ReadonlyMap<number, number>,
): QuestionAssembly {
    switch (question.questionType) {
        case QuestionTypeEnum.MCQ:
            return buildMcqQuestion(question as MultipleChoiceQuestion, order, rowsByRun, orderIndex);
        case QuestionTypeEnum.EMI:
            return buildEmiQuestion(question as ExtendedMatchingItems, order, rowsByRun, orderIndex);
        case QuestionTypeEnum.FFQ:
            return buildFfqQuestion(question as FreeFormQuestion, order, rowsByRun, orderIndex);
        default:
            return assertNever(question.questionType);
    }
}

/**
 * Reconciles a multiple-choice question: every definition option becomes a
 * distribution row, with whole-question correctness by exact-set equality.
 *
 * @param question   The multiple-choice definition question.
 * @param order      Zero-based position of the question within the assessment.
 * @param rowsByRun  Latest submission for the level, keyed by run id.
 * @param orderIndex Trainee order position keyed by run id.
 */
function buildMcqQuestion(
    question: MultipleChoiceQuestion,
    order: number,
    rowsByRun: ReadonlyMap<number, AssessmentAnswerRow>,
    orderIndex: ReadonlyMap<number, number>,
): QuestionAssembly {
    const choices = byOrder(question.choices);
    const correctOptionOrders = new Set(
        choices.filter((choice) => choice.correct).map((choice) => choice.order),
    );

    const chosenOrders = (answer: EventAnswer): number[] =>
        answer.type === 'MCQ'
            ? answer.selected_options
                  .map((selection) => parseOptionOrder(selection.value))
                  .filter((option): option is number => option !== null)
            : [];

    const { buckets, respondentCount } = invertChoosers(rowsByRun, question.id, chosenOrders);

    const options = choices.map(
        (choice): McqOptionVm => ({
            order: choice.order,
            text: choice.text,
            correct: choice.correct,
            distribution: buildDistribution(buckets.get(choice.order) ?? [], respondentCount, orderIndex),
        }),
    );

    const optionText = new Map(choices.map((choice) => [choice.order, choice.text]));

    const vm: McqQuestionVm = {
        kind: 'MCQ',
        ...questionBase(question, order, respondentCount),
        correctOptionOrders,
        options,
    };
    const isCorrect = (answer: EventAnswer): boolean =>
        answer.type === 'MCQ' && Utils.Set.equals(new Set(chosenOrders(answer)), correctOptionOrders);
    const describe = (answer: EventAnswer): string =>
        chosenOrders(answer)
            .map((chosen) => optionText.get(chosen) ?? '')
            .filter((text) => text !== '')
            .join(', ');

    return { vm, isCorrect, describe };
}

/**
 * Reconciles an extended-matching question into a sub-prompt × option matrix,
 * with the correct cell per row taken from the definition.
 *
 * @param question   The extended-matching definition question.
 * @param order      Zero-based position of the question within the assessment.
 * @param rowsByRun  Latest submission for the level, keyed by run id.
 * @param orderIndex Trainee order position keyed by run id.
 */
function buildEmiQuestion(
    question: ExtendedMatchingItems,
    order: number,
    rowsByRun: ReadonlyMap<number, AssessmentAnswerRow>,
    orderIndex: ReadonlyMap<number, number>,
): QuestionAssembly {
    const options = byOrder(question.extendedMatchingOptions);
    const statements = byOrder(question.extendedMatchingStatements);

    const cellKey = (statementOrder: number, optionOrder: number): string => `${statementOrder}:${optionOrder}`;
    const matchedOrder = (answer: EventAnswer, statementOrder: number): number | null => {
        if (answer.type !== 'EMI') {
            return null;
        }
        const selection = answer.pairs[String(statementOrder)];
        return selection === undefined ? null : parseOptionOrder(selection.value);
    };

    const { buckets, respondentCount } = invertChoosers(rowsByRun, question.id, (answer) => {
        const keys: string[] = [];
        for (const statement of statements) {
            const optionOrder = matchedOrder(answer, statement.order);
            if (optionOrder !== null) {
                keys.push(cellKey(statement.order, optionOrder));
            }
        }
        return keys;
    });

    const statementVms = statements.map((statement) => ({
        order: statement.order,
        text: statement.text,
        correctOptionOrder: statement.correctOptionOrder,
        cells: options.map(
            (option): EmiCellVm => ({
                optionOrder: option.order,
                distribution: buildDistribution(
                    buckets.get(cellKey(statement.order, option.order)) ?? [],
                    respondentCount,
                    orderIndex,
                ),
            }),
        ),
    }));

    const vm: EmiQuestionVm = {
        kind: 'EMI',
        ...questionBase(question, order, respondentCount),
        options: options.map((option) => ({ order: option.order, text: option.text })),
        statements: statementVms,
    };
    const optionText = new Map(options.map((option) => [option.order, option.text]));
    const isCorrect = (answer: EventAnswer): boolean =>
        answer.type === 'EMI' &&
        statements.every((statement) => matchedOrder(answer, statement.order) === statement.correctOptionOrder);
    const describe = (answer: EventAnswer): string =>
        statements
            .flatMap((statement) => {
                const optionOrder = matchedOrder(answer, statement.order);
                return optionOrder === null ? [] : [emiAnswerLabel(statement.text, optionText.get(optionOrder) ?? '')];
            })
            .join('; ');

    return { vm, isCorrect, describe };
}

/**
 * Reconciles a free-form question: the full correct-answer set (including
 * members nobody typed) and the distinct incorrect strings, each grouped
 * byte-exactly and ranked by count.
 *
 * @param question   The free-form definition question.
 * @param order      Zero-based position of the question within the assessment.
 * @param rowsByRun  Latest submission for the level, keyed by run id.
 * @param orderIndex Trainee order position keyed by run id.
 */
function buildFfqQuestion(
    question: FreeFormQuestion,
    order: number,
    rowsByRun: ReadonlyMap<number, AssessmentAnswerRow>,
    orderIndex: ReadonlyMap<number, number>,
): QuestionAssembly {
    const correctChoices = question.choices.filter((choice) => choice.correct);
    const correctTexts = new Set(correctChoices.map((choice) => choice.text));

    const typedText = (answer: EventAnswer): string[] =>
        answer.type === 'FFQ' && answer.answer !== null ? [String(answer.answer.value)] : [];

    const { buckets, respondentCount } = invertChoosers(rowsByRun, question.id, typedText);

    const correctAnswers = correctChoices
        .map(
            (choice): FfqAnswerVm => ({
                text: choice.text,
                correct: true,
                distribution: buildDistribution(buckets.get(choice.text) ?? [], respondentCount, orderIndex),
            }),
        )
        .sort((first, second) => second.distribution.count - first.distribution.count);

    const incorrectAnswers = [...buckets.entries()]
        .filter(([text]) => !correctTexts.has(text))
        .map(
            ([text, choosers]): FfqAnswerVm => ({
                text,
                correct: false,
                distribution: buildDistribution(choosers, respondentCount, orderIndex),
            }),
        )
        .sort((first, second) => second.distribution.count - first.distribution.count);

    const vm: FfqQuestionVm = {
        kind: 'FFQ',
        ...questionBase(question, order, respondentCount),
        correctAnswers,
        incorrectAnswers,
    };
    const isCorrect = (answer: EventAnswer): boolean =>
        answer.type === 'FFQ' && answer.answer !== null && correctTexts.has(String(answer.answer.value));
    const describe = (answer: EventAnswer): string =>
        answer.type === 'FFQ' && answer.answer !== null ? String(answer.answer.value) : '';

    return { vm, isCorrect, describe };
}

/**
 * Computes one trainee's per-question answer detail within an assessment
 * from their submission.
 *
 * @param row        The trainee's latest submission for the level.
 * @param assemblies The level's reconciled questions with their correctness tests.
 * @returns One answer detail per question, in question order.
 */
function buildAnswerDetails(
    row: AssessmentAnswerRow,
    assemblies: readonly ScopedAssembly[],
): readonly QuestionAnswerDetail[] {
    return assemblies.map(({ question, isCorrect, describe }): QuestionAnswerDetail => {
        const answer = findAnswer(row, question.id);
        if (answer === undefined) {
            return { questionId: question.id, answered: false, correct: false, pointsGained: 0, answerText: '' };
        }
        const answered = isAnswered(answer);
        const correct = answered && isCorrect(answer);
        return {
            questionId: question.id,
            answered,
            correct,
            pointsGained: answer.points_gained,
            answerText: describe(answer),
        };
    });
}

/**
 * Tallies a trainee's aggregate result for one assessment from their
 * per-question answer details.
 *
 * @param runId   The trainee's run identifier.
 * @param details The trainee's per-question answer details, in question order.
 * @returns The trainee's answered count, correct count, and total points.
 */
function buildTraineeResult(runId: number, details: readonly QuestionAnswerDetail[]): TraineeResult {
    const answeredCount = details.filter((detail) => detail.answered).length;
    const correctCount = details.filter((detail) => detail.correct).length;
    const points = Utils.Array.sum(details.map((detail) => detail.pointsGained));
    return { runId, hasAnswered: answeredCount > 0, answeredCount, points, correctCount };
}

/**
 * Whether the answer carries a real selection rather than an abstention.
 *
 * @param answer The trainee's answer to one question.
 */
function isAnswered(answer: EventAnswer): boolean {
    switch (answer.type) {
        case 'MCQ':
            return answer.selected_options.length > 0;
        case 'EMI':
            return Object.keys(answer.pairs).length > 0;
        case 'FFQ':
            return answer.answer !== null;
    }
}

/**
 * Groups respondents into chooser buckets in a single pass: each answered
 * submission contributes its run id to every key its answer yields, and counts
 * once toward the respondent total.
 *
 * @param rowsByRun   Latest submission for the level, keyed by run id.
 * @param questionId  The question whose answers are grouped.
 * @param keysOf      Extracts the answer's chooser keys (option orders, cell
 *                    keys, or verbatim texts); an abstention yields none.
 * @returns The chooser buckets keyed by answer key, and the respondent count.
 */
function invertChoosers<Key>(
    rowsByRun: ReadonlyMap<number, AssessmentAnswerRow>,
    questionId: number,
    keysOf: (answer: EventAnswer) => readonly Key[],
): { readonly buckets: ReadonlyMap<Key, readonly number[]>; readonly respondentCount: number } {
    const buckets = new Map<Key, number[]>();
    let respondentCount = 0;

    for (const [runId, row] of rowsByRun) {
        const answer = findAnswer(row, questionId);
        if (answer === undefined || !isAnswered(answer)) {
            continue;
        }
        respondentCount += 1;
        for (const key of keysOf(answer)) {
            const bucket = buckets.get(key) ?? [];
            bucket.push(runId);
            buckets.set(key, bucket);
        }
    }

    return { buckets, respondentCount };
}

/**
 * Parses an answer selection value into a finite option order, or null when it
 * is blank or non-numeric.
 *
 * @param value The raw selection value from an event answer.
 */
function parseOptionOrder(value: string | number): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    const trimmed = value.trim();
    if (trimmed === '') {
        return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Assembles the fields shared by every question view-model.
 *
 * @param question        The definition question.
 * @param order           Zero-based position within the assessment.
 * @param respondentCount Trainees who answered the question.
 */
function questionBase(question: Question, order: number, respondentCount: number): QuestionVmBase {
    return {
        id: question.id,
        order,
        title: question.title,
        score: question.score,
        penalty: question.penalty,
        respondentCount,
    };
}

/**
 * Builds an answer distribution: choosers in trainee order, count, and the
 * fraction of respondents.
 *
 * @param choosers        Run ids of trainees who chose the answer.
 * @param respondentCount Trainees who answered the question.
 * @param orderIndex      Trainee order position keyed by run id.
 */
function buildDistribution(
    choosers: readonly number[],
    respondentCount: number,
    orderIndex: ReadonlyMap<number, number>,
): AnswerDistribution {
    const chooserRunIds = [...choosers].sort(
        (first, second) => (orderIndex.get(first) ?? 0) - (orderIndex.get(second) ?? 0),
    );
    return {
        chooserRunIds,
        count: chooserRunIds.length,
        percent: respondentCount > 0 ? chooserRunIds.length / respondentCount : 0,
    };
}

/**
 * Finds a trainee's answer to a question within one submission.
 *
 * @param row        The trainee's submission.
 * @param questionId The question to look up.
 */
function findAnswer(row: AssessmentAnswerRow, questionId: number): EventAnswer | undefined {
    return row.answers.find((answer) => answer.question_id === questionId);
}

/**
 * Throws for a value the type system asserts is unreachable.
 *
 * @param value The value that should have no inhabitant.
 */
function assertNever(value: never): never {
    throw new Error(`Unhandled question type: ${String(value)}`);
}

/**
 * Returns a new array of the given order-bearing items sorted ascending by order.
 *
 * @param items The items to order.
 * @returns A new array ordered by the `order` field.
 */
function byOrder<T extends { readonly order: number }>(items: readonly T[]): T[] {
    return [...items].sort((first, second) => first.order - second.order);
}
