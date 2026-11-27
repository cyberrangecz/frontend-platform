import type { Page } from '@playwright/test';
import { ApiError } from '../support/api/api-client';
import { accountFor, ACCOUNTS, BROWSER_KEYS } from '../support/accounts';
import { expect, test } from '../support/fixtures';
import { checkpointCharts, ownRunChartShows, standingChartShows } from '../support/pages/review/chart-expectations';
import { RunOverviewPage } from '../support/pages/run/run-overview-page';
import { expectedResultOf, MAXIMUM_TOTAL_SCORE } from '../support/pages/review/expected-results';
import { SHARED_TRAINING_LEVEL_ORDER } from '../support/scenario/shared-training-loader';
import { TRAINEE_PLAYS } from '../support/scenario/trainee-plays';
import { readChainRecord } from '../support/shared-fixture';
import { captureDownload, type CapturedDownload, parseCsvRecords, waitForPageReady } from '../support/ui';

const CHART_SELECTORS = [
    'crczp-overall-speed-vs-score',
    'crczp-level-percentiles',
    'crczp-scoreboard-table',
    'crczp-assists-coverage',
    'crczp-cumulative-score-chart',
    'crczp-time-vs-score-chart',
    'crczp-event-timeline-chart',
];
const LEVEL_COUNT = SHARED_TRAINING_LEVEL_ORDER.length;

/** Downloads the CSV of the chart panel whose heading matches exactly and parses it into records. */
async function downloadPanelCsv(
    page: Page,
    heading: string,
): Promise<{ download: CapturedDownload; records: Record<string, string>[] }> {
    const panel = page.locator('crczp-chart-panel-shell').filter({
        has: page.getByRole('heading', { level: 3, name: heading, exact: true }),
    });
    const download = await captureDownload(page, () => panel.getByRole('button', { name: 'Download CSV' }).click());
    return { download, records: parseCsvRecords(download.content) };
}

const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;

test.describe('run.overview, run.linear.results and run.linear.resume of the finished run', () => {
    test.use({ account: 'chainTrainee' });

    test('finished run: overview and results', async ({ page, shared, browserKey, checkpoint }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const runId = readChainRecord(browserKey).trainingRunId;
        const result = expectedResultOf(browserKey);
        const overview = new RunOverviewPage(page);
        await overview.open();

        await test.step('lists the finished run with its results action enabled and resume disabled', async () => {
            const row = overview.rowOf(shared.trainingInstance.title);
            await expect.soft(row, 'row of the finished run').toHaveCount(1);
            await expect
                .soft(await overview.table.cell(row, /Completed Levels/i), 'completed levels')
                .toHaveText(`${LEVEL_COUNT}/${LEVEL_COUNT}`);
            await expect.soft(overview.resultsAction(row), 'Access Results action').toBeEnabled();
            await expect.soft(overview.resumeAction(row), 'Resume action').toBeDisabled();
            await checkpoint(page, 'finished run listed');
        });

        await test.step('opens the results from the Access Results action', async () => {
            await overview.resultsAction(overview.rowOf(shared.trainingInstance.title)).click();
            await expect.soft(page, 'address of the results').toHaveURL(new RegExp(`/run/linear/${runId}/results$`));
        });

        await page.goto(`/run/linear/${runId}/results`);
        await waitForPageReady(page);

        await test.step('shows the three dashboard sections', async () => {
            for (const label of ['Standing among trainees', 'Score & time', 'Run timeline']) {
                await expect
                    .soft(page.getByRole('heading', { name: label, exact: true }), `dashboard section ${label}`)
                    .toBeVisible();
            }
            await checkpoint(page, 'results dashboard');
        });

        await test.step('shows every visualization to the trainee', async () => {
            for (const selector of CHART_SELECTORS) {
                await expect.soft(page.locator(selector), `visualization ${selector}`).toBeVisible();
            }
            await checkpointCharts(page, checkpoint, {
                ...standingChartShows(result),
                ...ownRunChartShows(result),
            });
        });

        await test.step('shows the trainee identity and the run statistics in the feedback card', async () => {
            const play = TRAINEE_PLAYS[browserKey];
            const card = page.locator('crczp-feedback-overview');
            await expect.soft(card, 'feedback card load error').not.toContainText('Feedback data could not be loaded');
            await expect.soft(card, 'feedback card without data').not.toContainText('No data for this run');
            const statistic = (label: string) => card.locator('.feedback-card__stat').filter({ hasText: label });
            await expect
                .soft(card, 'trainee identity')
                .toContainText(ACCOUNTS[accountFor('chainTrainee', browserKey)].subject);
            await expect.soft(statistic('Levels solved'), 'levels solved').toContainText(`${LEVEL_COUNT}/${LEVEL_COUNT}`);
            await expect.soft(statistic('Wrong'), 'wrong answers').toContainText(String(result.wrongAnswers));
            await expect.soft(statistic('Hints'), 'hints').toContainText(String(play.hintsOnFirstTraining));
            await expect.soft(statistic('Solutions'), 'solutions').toContainText(String(result.solutions));
            await expect
                .soft(statistic('Score').locator('.feedback-card__stat-value'), 'score')
                .toHaveText(String(result.totalScore));
            for (const label of ['Percentile', 'Elapsed']) {
                await expect.soft(statistic(label), `${label} statistic`).toBeVisible();
            }
        });

        await test.step('downloads the own cumulative score level by level', async () => {
            const { download, records } = await downloadPanelCsv(page, 'Cumulative score');
            expect.soft(download.fileName, 'file name').toBe(`cumulative-score-run-${runId}.csv`);
            for (const level of result.levelScores) {
                const record = records.find((candidate) => candidate['Title'] === level.title);
                expect.soft(record?.['Gained this level'], `score of ${level.title}`).toBe(String(level.score));
                expect.soft(record?.['Level max'], `maximum of ${level.title}`).toBe(String(level.maximum));
            }
            expect.soft(records.at(-1)?.['Cumulative max'], 'cumulative maximum').toBe(String(MAXIMUM_TOTAL_SCORE));
            expect.soft(records.at(-1)?.['Actual cumulative'], 'actual cumulative').toBe(String(result.totalScore));
        });

        await test.step('downloads the own points earned against the time per level', async () => {
            const { download, records } = await downloadPanelCsv(page, 'Time vs score per level');
            expect.soft(download.fileName, 'file name').toBe(`time-vs-score-run-${runId}.csv`);
            for (const level of result.levelScores) {
                const record = records.find((candidate) => candidate['Title'] === level.title);
                expect.soft(record?.['Points earned'], `score of ${level.title}`).toBe(String(level.score));
            }
        });

        await test.step('names no other trainee on the page', async () => {
            const ownName = (await page.locator('.feedback-card__name').innerText()).trim();
            const names = (await page.locator('body').innerText()).match(/User\d+ Generated/g) ?? [];
            expect.soft(names.filter((name) => name !== ownName), 'names of other trainees').toEqual([]);
        });
    });

    test("resume guards and another trainee's run", async ({ page, apiAs, browserKey }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const other = BROWSER_KEYS.find((candidate) => candidate !== browserKey)!;
        const otherRunId = readChainRecord(other).trainingRunId!;

        await test.step('refuses to resume the finished run', async () => {
            await page.goto(`/run/linear/${readChainRecord(browserKey).trainingRunId}/resume`);
            await expect.soft(page, 'address after the resume attempt').toHaveURL(/\/run$/);
            await expect.soft(page.locator('crczp-abstract-level'), 'level of the finished run').toHaveCount(0);
        });

        await test.step("another trainee's run", async () => {
            await test.step('is refused by the backend', async () => {
                const error = await apiAs('chainTrainee')
                    .training.get(`/training-runs/${otherRunId}`)
                    .catch((reason: unknown) => reason);
                expect.soft(error, 'refusal of the other run').toBeInstanceOf(ApiError);
                expect.soft((error as ApiError | undefined)?.status, 'status of the refusal').toBe(403);
            });

            await test.step('cannot be resumed', async () => {
                await page.goto(`/run/linear/${otherRunId}/resume`);
                await expect.soft(page, 'address after the resume attempt').toHaveURL(/\/run$/);
                await expect.soft(page.locator('crczp-abstract-level'), 'level of the other run').toHaveCount(0);
            });

            await test.step('shows no results of the other trainee', async () => {
                await page.goto(`/run/linear/${otherRunId}/results`);
                await waitForPageReady(page);
                await expect
                    .soft(page.locator('body'), 'results of the other trainee')
                    .not.toContainText(ACCOUNTS[accountFor('chainTrainee', other)].subject);
            });
        });
    });
});
