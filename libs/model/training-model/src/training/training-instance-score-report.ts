import { Z } from '@crczp/zod-class';
import { z } from 'zod';
import { AbstractLevelBasic } from '../level/abstract-level-basic';

/**
 * One training run of an instance, with the trainee behind it, the span it occupied,
 * and every score and tally derived for it.
 */
export class ParticipantScoreRow extends Z.class({
    /** Position by total score descending, resolving ties in favour of the shorter run. */
    rank: z.number(),
    trainingRunId: z.number(),
    userRefId: z.number(),
    /** Trainee login, empty when the user reference could not be resolved. */
    login: z.string(),
    /** Trainee display name, falling back to the login and then the user reference id. */
    name: z.string(),
    /** Trainee email, empty when the user reference could not be resolved. */
    mail: z.string(),
    /** True once the run has ended, either by its own state or because its instance has ended. */
    finished: z.boolean(),
    startedAt: z.coerce.date(),
    /** Run end capped at the instance end; null while the run is still in progress. */
    endedAt: z.coerce.date().nullable(),
    /** Length of the run in whole seconds; null while the run is still in progress. */
    durationSeconds: z.number().nullable(),
    /** Score attained per level, keyed by level id, omitting levels never completed. */
    scoreByLevelId: z.map(z.number(), z.number()),
    trainingScore: z.number(),
    assessmentScore: z.number(),
    totalScore: z.number(),
    hintsTaken: z.number(),
    /** Wrong answers submitted across the run, excluding passkey retries. */
    wrongAnswers: z.number(),
    solutionsDisplayed: z.number(),
}) {}

/**
 * Standings of every participant of one training instance, alongside the level columns
 * those standings are broken down by.
 */
export class TrainingInstanceScoreReport extends Z.class({
    trainingInstanceId: z.number(),
    /** Instance end that every run in the report is capped at. */
    instanceEndAt: z.coerce.date(),
    /** Levels able to award score, in definition order. */
    scoredLevels: z.array(AbstractLevelBasic.schema()),
    /** Participants, ordered by rank. */
    rows: z.array(ParticipantScoreRow.schema()),
}) {}
