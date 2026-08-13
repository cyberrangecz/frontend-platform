import { format } from 'date-fns';
import { AbstractLevelBasic, ParticipantScoreRow } from '@crczp/training-model';
import { CsvColumn } from '@crczp/components';

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
 * Opens a per-level column header, setting the level columns apart from the fixed
 * identity, timing, total and activity columns they sit between.
 */
const LEVEL_COLUMN_PREFIX = 'Lvl: ';

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

/**
 * Builds the export's column definitions in output order: trainee identity and run
 * timing, one column per score-bearing level, the score totals, then the run's
 * activity counts.
 *
 * @param scoredLevels  Score-bearing levels, in definition order.
 * @returns Column definitions consumable by the CSV serializer.
 */
export function scoreExportColumns(
    scoredLevels: readonly AbstractLevelBasic[],
): readonly CsvColumn<ParticipantScoreRow>[] {
    return [
        { header: 'Rank', value: (row) => row.rank },
        { header: 'Login', value: (row) => neutralizeFormula(row.login) },
        { header: 'Name', value: (row) => neutralizeFormula(row.name) },
        { header: 'Mail', value: (row) => neutralizeFormula(row.mail) },
        { header: 'State', value: (row) => (row.finished ? 'Finished' : 'Running') },
        { header: 'Time started', value: (row) => format(row.startedAt, TIMESTAMP_PATTERN) },
        {
            header: 'Time ended',
            value: (row) => (row.endedAt === null ? '' : format(row.endedAt, TIMESTAMP_PATTERN)),
        },
        { header: 'Duration [s]', value: (row) => row.durationSeconds },
        ...scoredLevels.map(
            (level): CsvColumn<ParticipantScoreRow> => ({
                header: neutralizeFormula(`${LEVEL_COLUMN_PREFIX}${level.title}`),
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
