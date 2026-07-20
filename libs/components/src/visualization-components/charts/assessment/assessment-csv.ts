import { CsvColumn } from '../shared';
import { AssessmentVm, TraineeIdentity } from './assessment-view.model';

/** One row of the long-format assessment CSV: a single trainee's answer to one question. */
export interface AssessmentCsvRow {
    readonly trainee: string;
    readonly login: string;
    readonly email: string;
    readonly questionNumber: number;
    readonly question: string;
    readonly type: string;
    readonly answered: string;
    readonly answer: string;
    readonly correctness: string;
    readonly pointsGained: number;
    readonly maxPoints: number;
}

/**
 * @returns Column definitions for the long-format CSV, in output order:
 *          trainee identity, question number/title/type, whether answered,
 *          the trainee's answer, its correctness, points gained, and the
 *          question's maximum points.
 */
export function assessmentCsvColumns(): ReadonlyArray<CsvColumn<AssessmentCsvRow>> {
    return [
        { header: 'Trainee',       value: (row) => row.trainee },
        { header: 'Login',         value: (row) => row.login },
        { header: 'Email',         value: (row) => row.email },
        { header: 'Question #',    value: (row) => row.questionNumber },
        { header: 'Question',      value: (row) => row.question },
        { header: 'Type',          value: (row) => row.type },
        { header: 'Answered',      value: (row) => row.answered },
        { header: 'Answer',        value: (row) => row.answer },
        { header: 'Correctness',   value: (row) => row.correctness },
        { header: 'Points gained', value: (row) => row.pointsGained },
        { header: 'Max points',    value: (row) => row.maxPoints },
    ];
}

/**
 * Joins each submitting trainee's per-question answer detail with the given
 * assessment's question metadata into long-format rows; empty when no trainee
 * has submitted.
 *
 * @param assessment The assessment whose questions and submissions are joined.
 * @param trainees   Trainees to iterate, in the order the rows are emitted.
 * @returns The long-format rows, in trainee order then question order.
 */
export function assessmentCsvRows(
    assessment: AssessmentVm,
    trainees: readonly TraineeIdentity[],
): AssessmentCsvRow[] {
    const questionsById = new Map(assessment.questions.map((question) => [question.id, question]));
    const rows: AssessmentCsvRow[] = [];
    for (const trainee of trainees) {
        const details = assessment.submissions.get(trainee.runId);
        if (details === undefined) {
            continue;
        }
        for (const detail of details) {
            const question = questionsById.get(detail.questionId);
            if (question === undefined) {
                continue;
            }
            rows.push({
                trainee: trainee.name,
                login: trainee.login,
                email: trainee.email,
                questionNumber: question.order + 1,
                question: question.title,
                type: question.kind,
                answered: detail.answered ? 'Yes' : 'No',
                answer: detail.answerText,
                correctness: detail.answered ? (detail.correct ? 'Correct' : 'Incorrect') : '',
                pointsGained: detail.pointsGained,
                maxPoints: question.score,
            });
        }
    }
    return rows;
}
