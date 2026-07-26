import { format } from 'date-fns';
import { AbstractLevelTypeEnum, AssessmentTypeEnum, TrainingUser } from '@crczp/training-model';
import {
    byNumber,
    chainComparators,
    CsvColumn,
    LevelBasicView,
    reversed,
    runDurationMs,
} from '@crczp/components';
import {
    ExportActivityRow,
    ExportLevelCompletedRow,
    ExportWrongAnswerRow,
    ScoreExportAggregate,
} from './score-export.query';

/** Timestamp pattern used for the absolute run start and end columns. */
const TIMESTAMP_PATTERN = 'yyyy-MM-dd HH:mm:ss';

/** Leading characters that make a spreadsheet read a text cell as a formula. */
const FORMULA_LEAD_CHARACTERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Placeholder for a level the run never completed, distinguishing it from a level
 * completed with every point lost.
 */
const UNATTEMPTED_LEVEL_CELL = '-';

/**
 * Neutralizes a text cell that a spreadsheet would evaluate as a formula by prefixing
 * an apostrophe, so text carried in from a trainee profile or a level name is shown
 * literally. Applied to the text cells only; numeric cells are emitted unchanged and
 * keep their sign.
 *
 * @param value  Text destined for a CSV cell.
 * @returns The value, prefixed when it opens with a formula-triggering character.
 */
function neutralizeFormula(value: string): string {
    return FORMULA_LEAD_CHARACTERS.includes(value.charAt(0)) ? `'${value}` : value;
}

/** A level able to award score, contributing one per-level column to the export. */
export interface ScoredLevel {
    /** Level identifier, joining the definition's level list to level events. */
    readonly id: number;
    /** Level name, used verbatim as the column header. */
    readonly title: string;
}

/** One exported run, fully derived and ready for CSV serialization. */
export interface ScoreExportRow {
    /** 1-based position by total score descending, then shorter run first. */
    readonly rank: number;
    /** Trainee login, empty when the user could not be resolved. */
    readonly login: string;
    /** Trainee display name, falling back to login then the numeric user id. */
    readonly name: string;
    /** Trainee email, empty when the user could not be resolved. */
    readonly mail: string;
    /** Lifecycle label: `Finished` once the run has an end event, else `Running`. */
    readonly state: string;
    /** Absolute run start, formatted for spreadsheet import. */
    readonly timeStarted: string;
    /** Absolute run end capped at the instance end, empty while the run is still in progress. */
    readonly timeEnded: string;
    /** Whole-second run length, null while the run is still in progress. */
    readonly durationSeconds: number | null;
    /** Score attained per level, keyed by level id; absent for levels never completed. */
    readonly scoreByLevelId: ReadonlyMap<number, number>;
    /** Cumulative score across training levels. */
    readonly trainingScore: number;
    /** Cumulative score across assessment levels. */
    readonly assessmentScore: number;
    /** Combined training and assessment score. */
    readonly totalScore: number;
    /** Hints taken across the whole run. */
    readonly hintsTaken: number;
    /** Wrong answers submitted across the whole run. */
    readonly wrongAnswers: number;
    /** Solutions revealed across the whole run. */
    readonly solutionsDisplayed: number;
}

/** A run row before ranking, retaining the numeric run length the ranking orders by. */
interface UnrankedRow {
    /** The derived row, lacking only its rank. */
    readonly row: Omit<ScoreExportRow, 'rank'>;
    /** Run length in milliseconds, used to break ties on equal total score. */
    readonly durationMs: number;
}

/** The latest completion observed for one level of one run. */
interface LevelCompletion {
    /** Completion timestamp, used to keep the latest attempt. */
    readonly timestamp: number;
    /** Score standing in the level at that completion. */
    readonly score: number;
}

/**
 * Narrows a definition's levels to those able to award score: every training level,
 * plus assessment levels graded as a test. Info and access levels award nothing, and
 * a questionnaire assessment is never graded — its score field reports the level's
 * full maximum regardless of the responses given, so it is excluded rather than
 * reported as a perfect result.
 *
 * @param levels  Ordered levels of the training definition.
 * @returns The score-bearing levels, preserving definition order.
 */
export function selectScoredLevels(levels: readonly LevelBasicView[]): readonly ScoredLevel[] {
    return levels
        .filter(
            (level) =>
                level.type === AbstractLevelTypeEnum.Training ||
                (level.type === AbstractLevelTypeEnum.Assessment &&
                    level.assessmentType === AssessmentTypeEnum.Test),
        )
        .map((level) => ({ id: level.id, title: level.title }));
}

/**
 * Counts occurrences of an activity event per run.
 *
 * @param rows  One row per occurrence, each naming its owning run.
 * @returns Occurrence count keyed by run id.
 */
function countByRun(rows: readonly ExportActivityRow[]): ReadonlyMap<number, number> {
    const counts = new Map<number, number>();
    for (const row of rows) {
        counts.set(row.training_run_id, (counts.get(row.training_run_id) ?? 0) + 1);
    }
    return counts;
}

/**
 * Collects the identifiers of levels gated by a passkey. Such a level records a wrong
 * answer for every passkey attempt, the successful one included, so its events are kept
 * out of the exported mistake counts.
 *
 * @param levels  Ordered levels of the training definition.
 * @returns The identifiers of the access levels.
 */
function accessLevelIds(levels: readonly LevelBasicView[]): ReadonlySet<number> {
    return new Set(
        levels.filter((level) => level.type === AbstractLevelTypeEnum.Access).map((level) => level.id),
    );
}

/**
 * Counts wrong answers per run, skipping those submitted on a passkey-gated level.
 *
 * @param rows      One row per wrong answer, each naming its level.
 * @param excluded  Identifiers of levels whose wrong answers do not count as mistakes.
 * @returns Wrong-answer count keyed by run id.
 */
function countWrongAnswersByRun(
    rows: readonly ExportWrongAnswerRow[],
    excluded: ReadonlySet<number>,
): ReadonlyMap<number, number> {
    return countByRun(rows.filter((row) => !excluded.has(row.level_id)));
}

/**
 * Indexes level completions per run, keeping the latest completion per level so a
 * level re-entered and completed again reports its most recent standing.
 *
 * @param rows  All level-completion events for the instance.
 * @returns Score keyed by level id, nested under run id.
 */
function indexLevelScores(
    rows: readonly ExportLevelCompletedRow[],
): ReadonlyMap<number, ReadonlyMap<number, number>> {
    const latestByRun = new Map<number, Map<number, LevelCompletion>>();
    for (const row of rows) {
        let byLevel = latestByRun.get(row.training_run_id);
        if (!byLevel) {
            byLevel = new Map<number, LevelCompletion>();
            latestByRun.set(row.training_run_id, byLevel);
        }
        const latest = byLevel.get(row.level_id);
        if (latest === undefined || row.timestamp > latest.timestamp) {
            byLevel.set(row.level_id, { timestamp: row.timestamp, score: row.actual_score_in_level });
        }
    }

    const scoresByRun = new Map<number, ReadonlyMap<number, number>>();
    for (const [runId, byLevel] of latestByRun) {
        const scores = new Map<number, number>();
        for (const [levelId, completion] of byLevel) {
            scores.set(levelId, completion.score);
        }
        scoresByRun.set(runId, scores);
    }
    return scoresByRun;
}

/**
 * Derives one export row per started run and ranks them by total score descending,
 * resolving ties in favour of the shorter run. Running runs are included, carrying
 * their partial scores with the end and duration columns left blank.
 *
 * @param aggregate      Every event-cache read for the instance.
 * @param levels         Ordered levels of the training definition.
 * @param userMap        Resolved trainees, keyed by user id.
 * @param instanceEndMs  Instance end in milliseconds, capping run length and end time; null when unknown.
 * @param nowMs          Current clock in milliseconds, ending a still-running run.
 * @returns Ranked export rows, highest total score first.
 */
export function assembleScoreExportRows(
    aggregate: ScoreExportAggregate,
    levels: readonly LevelBasicView[],
    userMap: ReadonlyMap<number, TrainingUser>,
    instanceEndMs: number | null,
    nowMs: number,
): readonly ScoreExportRow[] {
    const scoresByRun = indexLevelScores(aggregate.levelCompletedRows);
    const hintCounts = countByRun(aggregate.hintRows);
    const solutionCounts = countByRun(aggregate.solutionRows);
    const wrongAnswerCounts = countWrongAnswersByRun(
        aggregate.wrongAnswerRows,
        accessLevelIds(levels),
    );

    const unranked = aggregate.timingRows.map((timing): UnrankedRow => {
        const runId = timing.training_run_id;
        const hasEndedRow = timing.ended_run_id !== null;
        const runWindow = {
            startTimestamp: timing.start_timestamp,
            endStartTime: timing.end_start_time,
            endEndTime: timing.end_end_time,
            hasEndedRow,
        };
        const durationMs = runDurationMs(runWindow, nowMs, instanceEndMs);
        const trainingScore = aggregate.scoreMaps.latestTrainingScoreByRunId.get(runId) ?? 0;
        const assessmentScore = aggregate.scoreMaps.latestAssessmentScoreByRunId.get(runId) ?? 0;
        const user = userMap.get(timing.user_ref_id);

        return {
            durationMs,
            row: {
                login: user?.login ?? '',
                name: user?.name ?? user?.login ?? String(timing.user_ref_id),
                mail: user?.mail ?? '',
                state: hasEndedRow ? 'Finished' : 'Running',
                timeStarted: format(new Date(timing.start_timestamp), TIMESTAMP_PATTERN),
                timeEnded:
                    timing.end_end_time === null
                        ? ''
                        : format(
                              new Date(
                                  instanceEndMs === null
                                      ? timing.end_end_time
                                      : Math.min(timing.end_end_time, instanceEndMs),
                              ),
                              TIMESTAMP_PATTERN,
                          ),
                durationSeconds: hasEndedRow ? Math.round(durationMs / 1000) : null,
                scoreByLevelId: scoresByRun.get(runId) ?? new Map<number, number>(),
                trainingScore,
                assessmentScore,
                totalScore: trainingScore + assessmentScore,
                hintsTaken: hintCounts.get(runId) ?? 0,
                wrongAnswers: wrongAnswerCounts.get(runId) ?? 0,
                solutionsDisplayed: solutionCounts.get(runId) ?? 0,
            },
        };
    });

    const byScoreThenSpeed = chainComparators<UnrankedRow>(
        reversed(byNumber((entry) => entry.row.totalScore)),
        byNumber((entry) => entry.durationMs),
    );

    return [...unranked]
        .sort(byScoreThenSpeed)
        .map((entry, index): ScoreExportRow => ({ rank: index + 1, ...entry.row }));
}

/**
 * Builds the export's column definitions in output order: trainee identity and run
 * timing, one column per score-bearing level, the score totals, then the run's
 * activity counts.
 *
 * @param scoredLevels  Score-bearing levels, in definition order.
 * @returns Column definitions consumable by the CSV serializer.
 */
export function scoreExportColumns(
    scoredLevels: readonly ScoredLevel[],
): readonly CsvColumn<ScoreExportRow>[] {
    return [
        { header: 'Rank', value: (row) => row.rank },
        { header: 'Login', value: (row) => neutralizeFormula(row.login) },
        { header: 'Name', value: (row) => neutralizeFormula(row.name) },
        { header: 'Mail', value: (row) => neutralizeFormula(row.mail) },
        { header: 'State', value: (row) => row.state },
        { header: 'Time started', value: (row) => row.timeStarted },
        { header: 'Time ended', value: (row) => row.timeEnded },
        { header: 'Duration [s]', value: (row) => row.durationSeconds },
        ...scoredLevels.map(
            (level): CsvColumn<ScoreExportRow> => ({
                header: neutralizeFormula(level.title),
                value: (row) => row.scoreByLevelId.get(level.id) ?? UNATTEMPTED_LEVEL_CELL,
            }),
        ),
        { header: 'Training score', value: (row) => row.trainingScore },
        { header: 'Assessment score', value: (row) => row.assessmentScore },
        { header: 'Score total', value: (row) => row.totalScore },
        { header: 'Hints taken', value: (row) => row.hintsTaken },
        { header: 'Wrong answers', value: (row) => row.wrongAnswers },
        { header: 'Solutions displayed', value: (row) => row.solutionsDisplayed },
    ];
}
