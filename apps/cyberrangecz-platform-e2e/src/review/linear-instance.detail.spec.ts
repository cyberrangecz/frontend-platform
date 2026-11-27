import type { Page } from '@playwright/test';
import { BROWSER_KEYS } from '../support/accounts';
import { expectedResultOf, browsersByRank } from '../support/pages/review/expected-results';
import { expect, test } from '../support/pages/review/review-test';
import { expectColumnSortability } from '../support/pages/review/sort-headers';
import {
    SHARED_TRAINING_ANSWERS,
    SHARED_TRAINING_LEVEL_TITLES,
    SHARED_TRAINING_LEVELS,
} from '../support/scenario/shared-training-loader';
import { readChainRecord } from '../support/shared-fixture';
import {
    captureDownload,
    control,
    errorDialog,
    parseCsvRecords,
    SentinelTable,
    waitForPageReady,
} from '../support/ui';

interface RunAnswerPayload {
    level_id: number;
    level_title: string;
    level_order: number;
    correct_answer?: string;
    variable_name?: string;
}

interface ScoreReportPayload {
    scored_levels: { id: number; title: string; max_score: number }[];
    rows: {
        rank: number;
        training_run_id: number;
        score_by_level_id: Record<string, number>;
        training_score: number;
        assessment_score: number;
        total_score: number;
    }[];
}

const SORTABLE_COLUMNS = [/^start time$/i, /^end time$/i, /^run state$/i];
const UNSORTABLE_COLUMNS = [/^player$/i, /^duration$/i, /^sandbox id$/i];
const MERGED_TEST_TIMEOUT_MILLISECONDS = 240_000;

test.describe('linear-instance.detail (run dependent parts)', () => {
    test.use({ account: 'trainingOrganizer' });
    test.describe.configure({ timeout: MERGED_TEST_TIMEOUT_MILLISECONDS });

    async function openDetail(page: Page, instanceId: number): Promise<void> {
        await page.goto(`/linear-instance/${instanceId}/detail`);
        await waitForPageReady(page);
        await SentinelTable.in(page).waitUntilLoaded();
    }

    async function namesInOrder(table: SentinelTable): Promise<string[]> {
        const rows = await table.rows.all();
        return Promise.all(
            rows.map(async (row) => (await (await table.cell(row, /^player$/i)).innerText()).trim()),
        );
    }

    test('checks the controls and the navigation of the detail page of the shared instance', async ({
        page,
        shared,
        checkpoint,
    }) => {
        await openDetail(page, shared.trainingInstance.id);

        await test.step('enables Show Results, Cheating Detection and Export Score for a started instance', async () => {
            for (const label of ['Show Results', 'Cheating Detection', 'Export Score']) {
                await expect.soft(control(page, label), `${label} control`).toBeEnabled();
            }
            await checkpoint(page, 'instance controls enabled');
        });

        await test.step('opens the results of the instance from Show Results', async () => {
            await control(page, 'Show Results').click();
            await expect(page).toHaveURL(new RegExp(`/linear-instance/${shared.trainingInstance.id}/analysis`));
            await openDetail(page, shared.trainingInstance.id);
        });

        await test.step('opens the cheating detections of the instance from Cheating Detection', async () => {
            await control(page, 'Cheating Detection').click();
            await expect(page).toHaveURL(
                new RegExp(`/linear-instance/${shared.trainingInstance.id}/cheating-detection$`),
            );
        });
    });

    test('checks the score export of the detail page', async ({ page, apiAs, shared, reviewRuns }) => {
        await openDetail(page, shared.trainingInstance.id);
        const download = await captureDownload(page, () => control(page, 'Export Score').click());
        const records = parseCsvRecords(download.content);
        const rankOrder = browsersByRank();

        await test.step('downloads the score report named after the instance with a row per trainee', async () => {
            expect
                .soft(download.fileName, 'file name')
                .toBe(`training-instance-${shared.trainingInstance.id}-scores.csv`);
            expect.soft(download.size, 'file size').toBeGreaterThan(0);
            for (const browser of BROWSER_KEYS) {
                const record = records.find((candidate) => candidate['Name'] === reviewRuns[browser].traineeName);
                expect.soft(record, `score row of the ${browser} trainee`).toBeDefined();
                expect.soft(record?.['Mail'], `mail of the ${browser} trainee`).toBe(reviewRuns[browser].traineeMail);
                expect.soft(record?.['State'], `state of the ${browser} trainee`).toBe('Finished');
                expect.soft(record?.['Time ended'], `end time of the ${browser} trainee`).not.toBe('');
            }
            await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
        });

        await test.step('exports the score, level scores and activity counts of each trainee', async () => {
            for (const browser of BROWSER_KEYS) {
                const expected = expectedResultOf(browser);
                const record = records.find((candidate) => candidate['Name'] === reviewRuns[browser].traineeName);
                expect
                    .soft(record?.['Rank'], `rank of the ${browser} trainee`)
                    .toBe(String(rankOrder.indexOf(browser) + 1));
                for (const level of expected.levelScores) {
                    expect
                        .soft(record?.[`Lvl: ${level.title}`], `${level.title} score of the ${browser} trainee`)
                        .toBe(String(level.score));
                }
                expect.soft(record?.['Training score'], `training score of ${browser}`).toBe(String(expected.trainingScore));
                expect.soft(record?.['Assessment score'], `assessment score of ${browser}`).toBe(String(expected.assessmentScore));
                expect.soft(record?.['Score total'], `total score of ${browser}`).toBe(String(expected.totalScore));
                expect.soft(record?.['Hints taken'], `hints of ${browser}`).toBe(String(expected.hints));
                expect.soft(record?.['Wrong answers'], `wrong answers of ${browser}`).toBe(String(expected.wrongFlagAnswers));
                expect.soft(record?.['Solutions displayed'], `solutions of ${browser}`).toBe(String(expected.solutions));
            }
        });

        await test.step('reports the score of every scored level of each trainee in the score report', async () => {
            const report = await apiAs('trainingOrganizer').training.get<ScoreReportPayload>(
                `/exports/training-instances/${shared.trainingInstance.id}/scores`,
            );
            for (const browser of BROWSER_KEYS) {
                const expected = expectedResultOf(browser);
                expect
                    .soft(
                        report.scored_levels.map((level) => level.title),
                        'scored levels',
                    )
                    .toEqual(expected.levelScores.map((level) => level.title));
                const row = report.rows.find((candidate) => candidate.training_run_id === reviewRuns[browser].runId);
                expect.soft(row, `score report row of the ${browser} trainee`).toBeDefined();
                expect.soft(row?.rank, `rank of ${browser}`).toBe(rankOrder.indexOf(browser) + 1);
                for (const level of expected.levelScores) {
                    const scoredLevel = report.scored_levels.find((candidate) => candidate.title === level.title);
                    expect.soft(scoredLevel?.max_score, `maximum of ${level.title}`).toBe(level.maximum);
                    expect
                        .soft(
                            row?.score_by_level_id[String(scoredLevel?.id)],
                            `${level.title} score of the ${browser} trainee`,
                        )
                        .toBe(level.score);
                }
                expect.soft(row?.training_score, `training score of ${browser}`).toBe(expected.trainingScore);
                expect.soft(row?.assessment_score, `assessment score of ${browser}`).toBe(expected.assessmentScore);
                expect.soft(row?.total_score, `total score of ${browser}`).toBe(expected.totalScore);
            }
        });
    });

    test('checks the run table of the detail page', async ({ page, shared, browserKey, reviewRuns }) => {
        await openDetail(page, shared.trainingInstance.id);
        const table = SentinelTable.in(page);
        const run = reviewRuns[browserKey];
        const newestFirst = [...BROWSER_KEYS]
            .sort((left, right) => reviewRuns[right].startTime - reviewRuns[left].startTime)
            .map((browser) => reviewRuns[browser].traineeName);

        await test.step('lists one row for the trainee of each browser', async () => {
            for (const browser of BROWSER_KEYS) {
                await expect
                    .soft(table.rowByText(reviewRuns[browser].traineeName), `row of the ${browser} trainee`)
                    .toHaveCount(1);
            }
        });

        await test.step('shows the finished state, end time and duration of a finished run', async () => {
            const row = table.rowByText(run.traineeName);
            await expect.soft(await table.cell(row, /^run state$/i), 'run state').toHaveText(/finished/i);
            await expect.soft(await table.cell(row, /^end time$/i), 'end time').not.toHaveText('-');
            await expect.soft(await table.cell(row, /^duration$/i), 'duration').not.toHaveText('-');
        });

        await test.step('lists the runs by start time, newest first, on the initial load', async () => {
            await expect
                .soft(table.headerCell(/^start time$/i), 'start time header sort')
                .toHaveAttribute('aria-sort', 'descending');
            await expect.configure({ soft: true }).poll(() => namesInOrder(table), { message: 'run order' }).toEqual(newestFirst);
        });

        await test.step('reports the range of the runs the paginator shows', async () => {
            await expect
                .soft(table.rangeLabel, 'paginator range')
                .toHaveText(new RegExp(`of ${BROWSER_KEYS.length}\\s*$`));
            await expect.soft(table.nextPageButton, 'next page button').toBeDisabled();
        });

        await test.step('shows the allocation id of the sandbox a run played in', async () => {
            expect.soft(run.allocationUnitId, 'allocation unit the run played in').not.toBeNull();
            const row = table.rowByText(run.traineeName);
            await expect
                .soft(await table.cell(row, /^sandbox id$/i), 'sandbox id')
                .toHaveText(String(run.allocationUnitId));
        });

        await test.step('marks start time, end time and run state as sortable and the others, the player included, as not', async () => {
            await expectColumnSortability(table, SORTABLE_COLUMNS, UNSORTABLE_COLUMNS);
        });

        await test.step('orders the runs by start time in both directions', async () => {
            const expectedAscending = [...newestFirst].reverse();
            await table.sortBy(/^start time$/i);
            await expect.soft(table.headerCell(/^start time$/i), 'ascending header').toHaveAttribute('aria-sort', 'ascending');
            await expect.configure({ soft: true }).poll(() => namesInOrder(table), { message: 'ascending order' }).toEqual(expectedAscending);
            await table.sortBy(/^start time$/i);
            await expect.soft(table.headerCell(/^start time$/i), 'descending header').toHaveAttribute('aria-sort', 'descending');
            await expect.configure({ soft: true }).poll(() => namesInOrder(table), { message: 'descending order' }).toEqual(newestFirst);
        });

        await test.step('orders the runs by end time in both directions', async () => {
            const byEnd = [...BROWSER_KEYS].sort((left, right) => reviewRuns[left].endTime - reviewRuns[right].endTime);
            const expectedAscending = byEnd.map((browser) => reviewRuns[browser].traineeName);
            await table.sortTo(/^end time$/i, 'ascending');
            await expect.configure({ soft: true }).poll(() => namesInOrder(table), { message: 'ascending order' }).toEqual(expectedAscending);
            await table.sortBy(/^end time$/i);
            await expect
                .configure({ soft: true })
                .poll(() => namesInOrder(table), { message: 'descending order' })
                .toEqual([...expectedAscending].reverse());
        });

        await test.step('reloads the runs without an error when sorted by each sortable column', async () => {
            for (const column of SORTABLE_COLUMNS) {
                for (const direction of ['ascending', 'descending'] as const) {
                    await table.sortTo(column, direction);
                    await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
                    await expect.soft(table.rows, 'run rows').toHaveCount(BROWSER_KEYS.length);
                }
            }
        });

        await test.step('keeps every run listed when sorting by run state', async () => {
            await table.sortTo(/^run state$/i, 'ascending');
            await expect.soft(table.rows, 'run rows').toHaveCount(BROWSER_KEYS.length);
        });
    });

    test('checks the expanded run of the detail page', async ({ page, apiAs, shared, browserKey, reviewRuns, checkpoint }) => {
        const raisedErrors: string[] = [];
        page.on('pageerror', (error) => raisedErrors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error') {
                raisedErrors.push(message.text());
            }
        });
        await openDetail(page, shared.trainingInstance.id);
        const table = SentinelTable.in(page);
        const run = reviewRuns[browserKey];
        const row = table.rowByText(run.traineeName);
        await table.expandButton(row).click();
        await expect(table.expandedDetails).toHaveCount(1);
        const nested = SentinelTable.in(table.expandedDetails.first());
        await expect(nested.rows.first().or(nested.emptyState)).toBeVisible();

        await test.step('expands a run to the correct answers of its levels', async () => {
            const answers = await apiAs('trainingOrganizer').training.get<RunAnswerPayload[]>(
                `/training-runs/${run.runId}/answers`,
            );
            await expect.soft(nested.rows, 'level rows').toHaveCount(answers.length);
            for (const answer of answers) {
                const levelRow = nested.rowByText(answer.level_title).first();
                await expect.soft(await nested.cell(levelRow, /^level id$/i), `level id of ${answer.level_title}`).toHaveText(String(answer.level_id));
                await expect
                    .soft(await nested.cell(levelRow, /^level order$/i), `level order of ${answer.level_title}`)
                    .toHaveText(String(answer.level_order));
                if (answer.level_title === SHARED_TRAINING_LEVEL_TITLES.assessment) {
                    expect.soft(answer.correct_answer, 'an assessment has no correct answer').toBeUndefined();
                    await expect
                        .soft(await nested.cell(levelRow, /^correct answer$/i), 'assessment correct answer')
                        .toHaveText('');
                } else {
                    expect.soft(answer.correct_answer, `correct answer of ${answer.level_title}`).toBeDefined();
                    await expect
                        .soft(await nested.cell(levelRow, /^correct answer$/i), `correct answer of ${answer.level_title}`)
                        .toHaveText(answer.correct_answer ?? '');
                }
                await expect
                    .soft(await nested.cell(levelRow, /^variable name$/i), `variable name of ${answer.level_title}`)
                    .toHaveText(answer.variable_name ?? '-');
            }
            await checkpoint(page, 'run expanded to level answers');
        });

        await test.step('shows the flags of the training levels in the expanded run', async () => {
            const firstRow = nested.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining);
            const secondRow = nested.rowByText(SHARED_TRAINING_LEVEL_TITLES.secondTraining);
            await expect
                .soft(await nested.cell(firstRow, /^correct answer$/i), 'first training flag')
                .toHaveText(SHARED_TRAINING_ANSWERS.firstFlag);
            await expect
                .soft(await nested.cell(secondRow, /^correct answer$/i), 'second training flag')
                .toHaveText(SHARED_TRAINING_ANSWERS.secondFlag);
        });

        await test.step('shows the variant answer of the trainee under its variable name in the expanded run', async () => {
            const variantRow = nested.rowByText(SHARED_TRAINING_LEVEL_TITLES.variantTraining);
            await expect
                .soft(await nested.cell(variantRow, /^correct answer$/i), 'variant answer')
                .toHaveText(readChainRecord(browserKey).variantAnswer ?? '');
            await expect
                .soft(await nested.cell(variantRow, /^variable name$/i), 'variable name')
                .toHaveText(SHARED_TRAINING_LEVELS.variantTraining.answer_variable_name ?? '');
        });

        await test.step('keeps the run list listed and raises no error while a run expands', async () => {
            await expect.soft(nested.rows.first(), 'first level row').toBeVisible();
            await expect.soft(row.first(), 'expanded run row').toBeVisible();
            for (const browser of BROWSER_KEYS) {
                await expect
                    .soft(table.rowByText(reviewRuns[browser].traineeName).first(), `row of the ${browser} trainee`)
                    .toBeVisible();
            }
            await expect.soft(table.headerCell(/^player$/i), 'player column').toBeVisible();
            expect.soft(raisedErrors, 'errors raised while the run expanded').toEqual([]);
        });

        await test.step('collapses an expanded run again', async () => {
            await table.expandButton(table.rowByText(run.traineeName).first()).click();
            await expect.soft(table.expandedDetails, 'expanded details').toHaveCount(0);
        });
    });
});
