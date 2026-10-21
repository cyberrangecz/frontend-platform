import { expectRedirectedAway } from '../support/route-guard';
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
    correct_answer: string;
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

test.describe('linear-instance.detail (run dependent parts)', () => {
    test.use({ account: 'trainingOrganizer' });

    test.beforeEach(async ({ page, shared }) => {
        await page.goto(`/linear-instance/${shared.trainingInstance.id}/detail`);
        await waitForPageReady(page);
        await SentinelTable.in(page).waitUntilLoaded();
    });

    async function namesInOrder(table: SentinelTable): Promise<string[]> {
        const rows = await table.rows.all();
        return Promise.all(
            rows.map(async (row) => (await (await table.cell(row, /^player$/i)).innerText()).trim()),
        );
    }

    test('enables Show Results, Cheating Detection and Export Score for a started instance', async ({
        page,
        checkpoint,
    }) => {
        for (const label of ['Show Results', 'Cheating Detection', 'Export Score']) {
            await expect(control(page, label)).toBeEnabled();
        }
        await checkpoint(page, 'instance controls enabled');
    });

    test('opens the results of the instance from Show Results', async ({ page, shared }) => {
        await control(page, 'Show Results').click();
        await expect(page).toHaveURL(new RegExp(`/linear-instance/${shared.trainingInstance.id}/analysis`));
    });

    test('opens the cheating detections of the instance from Cheating Detection', async ({
        page,
        shared,
    }) => {
        await control(page, 'Cheating Detection').click();
        await expect(page).toHaveURL(
            new RegExp(`/linear-instance/${shared.trainingInstance.id}/cheating-detection$`),
        );
    });

    test('downloads the score report named after the instance with a row per trainee', async ({
        page,
        shared,
        reviewRuns,
    }) => {
        const download = await captureDownload(page, () => control(page, 'Export Score').click());
        expect(download.fileName).toBe(`training-instance-${shared.trainingInstance.id}-scores.csv`);
        expect(download.size).toBeGreaterThan(0);
        const records = parseCsvRecords(download.content);
        for (const browser of BROWSER_KEYS) {
            const record = records.find((candidate) => candidate['Name'] === reviewRuns[browser].traineeName);
            expect(record, `score row of the ${browser} trainee`).toBeDefined();
            expect(record?.['Mail']).toBe(reviewRuns[browser].traineeMail);
            expect(record?.['State']).toBe('Finished');
            expect(record?.['Time ended']).not.toBe('');
        }
        await expect(errorDialog(page)).toHaveCount(0);
    });

    test('exports the score, level scores and activity counts of each trainee', async ({
        page,
        reviewRuns,
    }) => {
        const download = await captureDownload(page, () => control(page, 'Export Score').click());
        const records = parseCsvRecords(download.content);
        const rankOrder = browsersByRank();
        for (const browser of BROWSER_KEYS) {
            const expected = expectedResultOf(browser);
            const record = records.find((candidate) => candidate['Name'] === reviewRuns[browser].traineeName);
            expect(record?.['Rank'], `rank of the ${browser} trainee`).toBe(String(rankOrder.indexOf(browser) + 1));
            for (const level of expected.levelScores) {
                expect(record?.[`Lvl: ${level.title}`], `${level.title} score of the ${browser} trainee`).toBe(
                    String(level.score),
                );
            }
            expect(record?.['Training score']).toBe(String(expected.trainingScore));
            expect(record?.['Assessment score']).toBe(String(expected.assessmentScore));
            expect(record?.['Score total']).toBe(String(expected.totalScore));
            expect(record?.['Hints taken']).toBe(String(expected.hints));
            expect(record?.['Wrong answers']).toBe(String(expected.wrongFlagAnswers));
            expect(record?.['Solutions displayed']).toBe(String(expected.solutions));
        }
    });

    test('reports the score of every scored level of each trainee in the score report', async ({
        apiAs,
        shared,
        reviewRuns,
    }) => {
        const report = await apiAs('trainingOrganizer').training.get<ScoreReportPayload>(
            `/exports/training-instances/${shared.trainingInstance.id}/scores`,
        );
        const rankOrder = browsersByRank();
        for (const browser of BROWSER_KEYS) {
            const expected = expectedResultOf(browser);
            expect(report.scored_levels.map((level) => level.title)).toEqual(
                expected.levelScores.map((level) => level.title),
            );
            const row = report.rows.find((candidate) => candidate.training_run_id === reviewRuns[browser].runId);
            expect(row, `score report row of the ${browser} trainee`).toBeDefined();
            expect(row?.rank).toBe(rankOrder.indexOf(browser) + 1);
            for (const level of expected.levelScores) {
                const scoredLevel = report.scored_levels.find((candidate) => candidate.title === level.title);
                expect(scoredLevel?.max_score, `maximum of ${level.title}`).toBe(level.maximum);
                expect(
                    row?.score_by_level_id[String(scoredLevel?.id)],
                    `${level.title} score of the ${browser} trainee`,
                ).toBe(level.score);
            }
            expect(row?.training_score).toBe(expected.trainingScore);
            expect(row?.assessment_score).toBe(expected.assessmentScore);
            expect(row?.total_score).toBe(expected.totalScore);
        }
    });

    test('shows the allocation id of the sandbox a run played in', async ({ page, browserKey, reviewRuns }) => {
        const run = reviewRuns[browserKey];
        expect(run.allocationUnitId, 'allocation unit the run played in').not.toBeNull();
        const table = SentinelTable.in(page);
        const row = table.rowByText(run.traineeName);
        await expect(await table.cell(row, /^sandbox id$/i)).toHaveText(String(run.allocationUnitId));
    });

    test('marks start time, end time and run state as sortable and the others, the player included, as not', async ({
        page,
    }) => {
        await expectColumnSortability(SentinelTable.in(page), SORTABLE_COLUMNS, UNSORTABLE_COLUMNS);
    });

    test('orders the runs by start time in both directions', async ({ page, reviewRuns }) => {
        const table = SentinelTable.in(page);
        const byStart = [...BROWSER_KEYS].sort(
            (left, right) => reviewRuns[left].startTime - reviewRuns[right].startTime,
        );
        const expectedAscending = byStart.map((browser) => reviewRuns[browser].traineeName);
        await table.sortBy(/^start time$/i);
        await expect(table.headerCell(/^start time$/i)).toHaveAttribute('aria-sort', 'ascending');
        await expect.poll(() => namesInOrder(table)).toEqual(expectedAscending);
        await table.sortBy(/^start time$/i);
        await expect(table.headerCell(/^start time$/i)).toHaveAttribute('aria-sort', 'descending');
        await expect.poll(() => namesInOrder(table)).toEqual([...expectedAscending].reverse());
    });

    test('orders the runs by end time in both directions', async ({ page, reviewRuns }) => {
        const table = SentinelTable.in(page);
        const byEnd = [...BROWSER_KEYS].sort(
            (left, right) => reviewRuns[left].endTime - reviewRuns[right].endTime,
        );
        const expectedAscending = byEnd.map((browser) => reviewRuns[browser].traineeName);
        await table.sortTo(/^end time$/i, 'ascending');
        await expect.poll(() => namesInOrder(table)).toEqual(expectedAscending);
        await table.sortBy(/^end time$/i);
        await expect.poll(() => namesInOrder(table)).toEqual([...expectedAscending].reverse());
    });

    test('reloads the runs without an error when sorted by each sortable column', async ({ page }) => {
        const table = SentinelTable.in(page);
        for (const column of [/^start time$/i, /^end time$/i, /^run state$/i]) {
            for (const direction of ['ascending', 'descending'] as const) {
                await table.sortTo(column, direction);
                await expect(errorDialog(page)).toHaveCount(0);
                await expect(table.rows).toHaveCount(BROWSER_KEYS.length);
            }
        }
    });

    test('lists the runs by start time, newest first, on the initial load', async ({ page, reviewRuns }) => {
        const table = SentinelTable.in(page);
        const newestFirst = [...BROWSER_KEYS]
            .sort((left, right) => reviewRuns[right].startTime - reviewRuns[left].startTime)
            .map((browser) => reviewRuns[browser].traineeName);
        await expect(table.headerCell(/^start time$/i)).toHaveAttribute('aria-sort', 'descending');
        await expect.poll(() => namesInOrder(table)).toEqual(newestFirst);
    });

    test('keeps every run listed when sorting by run state', async ({ page }) => {
        const table = SentinelTable.in(page);
        await table.sortTo(/^run state$/i, 'ascending');
        await expect(table.rows).toHaveCount(BROWSER_KEYS.length);
    });

    test('reports the range of the runs the paginator shows', async ({ page }) => {
        const table = SentinelTable.in(page);
        await expect(table.rangeLabel).toHaveText(new RegExp(`of ${BROWSER_KEYS.length}\\s*$`));
        await expect(table.nextPageButton).toBeDisabled();
    });

    async function expandRun(table: SentinelTable, name: string): Promise<SentinelTable> {
        const row = table.rowByText(name);
        await table.expandButton(row).click();
        await expect(table.expandedDetails).toHaveCount(1);
        const nested = SentinelTable.in(table.expandedDetails.first());
        await expect(nested.rows.first().or(nested.emptyState)).toBeVisible();
        return nested;
    }

    test('expands a run to the correct answers of its levels', async ({
        page,
        apiAs,
        browserKey,
        reviewRuns,
        checkpoint,
    }) => {
        const table = SentinelTable.in(page);
        const run = reviewRuns[browserKey];
        const nested = await expandRun(table, run.traineeName);
        const answers = await apiAs('trainingOrganizer').training.get<RunAnswerPayload[]>(
            `/training-runs/${run.runId}/answers`,
        );
        await expect(nested.rows).toHaveCount(answers.length);
        for (const answer of answers) {
            const row = nested.rowByText(answer.level_title).first();
            await expect(await nested.cell(row, /^level id$/i)).toHaveText(String(answer.level_id));
            await expect(await nested.cell(row, /^level order$/i)).toHaveText(String(answer.level_order));
            await expect(await nested.cell(row, /^correct answer$/i)).toHaveText(answer.correct_answer);
            await expect(await nested.cell(row, /^variable name$/i)).toHaveText(answer.variable_name ?? '-');
        }
        await checkpoint(page, 'run expanded to level answers');
    });

    test('shows the flags of the training levels in the expanded run', async ({
        page,
        browserKey,
        reviewRuns,
    }) => {
        const table = SentinelTable.in(page);
        const nested = await expandRun(table, reviewRuns[browserKey].traineeName);
        const firstRow = nested.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining);
        const secondRow = nested.rowByText(SHARED_TRAINING_LEVEL_TITLES.secondTraining);
        await expect(await nested.cell(firstRow, /^correct answer$/i)).toHaveText(
            SHARED_TRAINING_ANSWERS.firstFlag,
        );
        await expect(await nested.cell(secondRow, /^correct answer$/i)).toHaveText(
            SHARED_TRAINING_ANSWERS.secondFlag,
        );
    });

    test('shows the variant answer of the trainee under its variable name in the expanded run', async ({
        page,
        browserKey,
        reviewRuns,
    }) => {
        const table = SentinelTable.in(page);
        const nested = await expandRun(table, reviewRuns[browserKey].traineeName);
        const variantRow = nested.rowByText(SHARED_TRAINING_LEVEL_TITLES.variantTraining);
        await expect(await nested.cell(variantRow, /^correct answer$/i)).toHaveText(
            readChainRecord(browserKey).variantAnswer!,
        );
        await expect(await nested.cell(variantRow, /^variable name$/i)).toHaveText(
            SHARED_TRAINING_LEVELS.variantTraining.answer_variable_name!,
        );
    });

    test('collapses an expanded run again',async ({ page, browserKey, reviewRuns }) => {
        const table = SentinelTable.in(page);
        const name = reviewRuns[browserKey].traineeName;
        await expandRun(table, name);
        await table.expandButton(table.rowByText(name).first()).click();
        await expect(table.expandedDetails).toHaveCount(0);
    });

    test('keeps the run list listed and raises no error while a run expands', async ({
        page,
        browserKey,
        reviewRuns,
    }) => {
        const raisedErrors: string[] = [];
        page.on('pageerror', (error) => raisedErrors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error') {
                raisedErrors.push(message.text());
            }
        });
        const table = SentinelTable.in(page);
        const name = reviewRuns[browserKey].traineeName;
        const nested = await expandRun(table, name);
        await expect(nested.rows.first()).toBeVisible();
        await expect(table.rowByText(name).first()).toBeVisible();
        for (const browser of BROWSER_KEYS) {
            await expect(table.rowByText(reviewRuns[browser].traineeName).first()).toBeVisible();
        }
        await expect(table.headerCell(/^player$/i)).toBeVisible();
        expect(raisedErrors, 'errors raised while the run expanded').toEqual([]);
    });

    test('sends a trainee away from the detail page',async ({ openAs, shared }) => {
        await expectRedirectedAway(openAs, 'trainee', `/linear-instance/${shared.trainingInstance.id}/detail`);
    });
});

