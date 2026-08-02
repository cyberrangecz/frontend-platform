import { Z } from 'zod-class';
import { z } from 'zod';
import { AbstractLevelBasic } from '../level/abstract-level-basic';

/**
 * One training run of an instance, with the trainee behind it, the span it occupied,
 * and every score and tally derived for it.
 */
export class ParticipantScoreRow extends Z.class({
    rank: z.number(),
    trainingRunId: z.number(),
    userRefId: z.number(),
    login: z.string(),
    name: z.string(),
    mail: z.string(),
    finished: z.boolean(),
    startedAt: z.date(),
    endedAt: z.date().nullable(),
    durationSeconds: z.number().nullable(),
    scoreByLevelId: z.map(z.number(), z.number()),
    trainingScore: z.number(),
    assessmentScore: z.number(),
    totalScore: z.number(),
    hintsTaken: z.number(),
    wrongAnswers: z.number(),
    solutionsDisplayed: z.number(),
}) {
    /** Position by total score descending, resolving ties in favour of the shorter run. */
    declare rank: number;
    declare trainingRunId: number;
    declare userRefId: number;
    /** Trainee login, empty when the user reference could not be resolved. */
    declare login: string;
    /** Trainee display name, falling back to the login and then the user reference id. */
    declare name: string;
    /** Trainee email, empty when the user reference could not be resolved. */
    declare mail: string;
    /** True once the run has ended, either by its own state or because its instance has ended. */
    declare finished: boolean;
    declare startedAt: Date;
    /** Run end capped at the instance end; null while the run is still in progress. */
    declare endedAt: Date | null;
    /** Length of the run in whole seconds; null while the run is still in progress. */
    declare durationSeconds: number | null;
    /** Score attained per level, keyed by level id, omitting levels never completed. */
    declare scoreByLevelId: Map<number, number>;
    declare trainingScore: number;
    declare assessmentScore: number;
    declare totalScore: number;
    declare hintsTaken: number;
    /** Wrong answers submitted across the run, excluding passkey retries. */
    declare wrongAnswers: number;
    declare solutionsDisplayed: number;
}

/**
 * Standings of every participant of one training instance, alongside the level columns
 * those standings are broken down by.
 */
export class TrainingInstanceScoreReport extends Z.class({
    trainingInstanceId: z.number(),
    instanceEndAt: z.date(),
    scoredLevels: z.array(AbstractLevelBasic.schema()),
    rows: z.array(ParticipantScoreRow.schema()),
}) {
    declare trainingInstanceId: number;
    /** Instance end that every run in the report is capped at. */
    declare instanceEndAt: Date;
    /** Levels able to award score, in definition order. */
    declare scoredLevels: AbstractLevelBasic[];
    /** Participants, ordered by rank. */
    declare rows: ParticipantScoreRow[];
}
