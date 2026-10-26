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

test.describe('run.overview, run.linear.results and run.linear.resume of the finished run', () => {
    test.use({ account: 'chainTrainee' });

    test('lists the finished run with its results action enabled and resume disabled', async ({
        page,
        shared,
        checkpoint,
    }) => {
        const overview = new RunOverviewPage(page);
        await overview.open();
        const row = overview.rowOf(shared.trainingInstance.title);
        await expect(row).toHaveCount(1);
        await expect(await overview.table.cell(row, /Completed Levels/i)).toHaveText(
            `${LEVEL_COUNT}/${LEVEL_COUNT}`,
        );
        await expect(overview.resultsAction(row)).toBeEnabled();
        await expect(overview.resumeAction(row)).toBeDisabled();
        await checkpoint(page, 'finished run listed');
    });

    test('opens the results from the Access Results action', async ({
        page,
        shared,
        browserKey,
    }) => {
        const overview = new RunOverviewPage(page);
        await overview.open();
        await overview.resultsAction(overview.rowOf(shared.trainingInstance.title)).click();
        await expect(page).toHaveURL(
            new RegExp(`/run/linear/${readChainRecord(browserKey).trainingRunId}/results$`),
        );
    });

    test.describe('results page', () => {
        test.beforeEach(async ({ page, browserKey }) => {
            await page.goto(`/run/linear/${readChainRecord(browserKey).trainingRunId}/results`);
            await waitForPageReady(page);
        });

        test('shows the three dashboard sections', async ({ page, checkpoint }) => {
            for (const label of ['Standing among trainees', 'Score & time', 'Run timeline']) {
                await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
            }
            await checkpoint(page, 'results dashboard');
        });

        test('shows every visualization to the trainee', async ({ page, browserKey, checkpoint }) => {
            for (const selector of CHART_SELECTORS) {
                await expect(page.locator(selector)).toBeVisible();
            }
            const result = expectedResultOf(browserKey);
            await checkpointCharts(page, checkpoint, {
                ...standingChartShows(result),
                ...ownRunChartShows(result),
            });
        });

        test('shows the trainee identity and the run statistics in the feedback card', async ({
            page,
            browserKey,
        }) => {
            const play = TRAINEE_PLAYS[browserKey];
            const card = page.locator('crczp-feedback-overview');
            await expect(card).not.toContainText('Feedback data could not be loaded');
            await expect(card).not.toContainText('No data for this run');
            const statistic = (label: string) =>
                card.locator('.feedback-card__stat').filter({ hasText: label });
            await expect(card).toContainText(ACCOUNTS[accountFor('chainTrainee', browserKey)].subject);
            await expect(statistic('Levels solved')).toContainText(`${LEVEL_COUNT}/${LEVEL_COUNT}`);
            await expect(statistic('Wrong')).toContainText(String(expectedResultOf(browserKey).wrongAnswers));
            await expect(statistic('Hints')).toContainText(String(play.hintsOnFirstTraining));
            await expect(statistic('Solutions')).toContainText(String(expectedResultOf(browserKey).solutions));
            await expect(statistic('Score').locator('.feedback-card__stat-value')).toHaveText(
                String(expectedResultOf(browserKey).totalScore),
            );
            for (const label of ['Percentile', 'Elapsed']) {
                await expect(statistic(label)).toBeVisible();
            }
        });

        test('downloads the own cumulative score level by level', async ({ page, browserKey }) => {
            const runId = readChainRecord(browserKey).trainingRunId;
            const expected = expectedResultOf(browserKey);
            const { download, records } = await downloadPanelCsv(page, 'Cumulative score');
            expect(download.fileName).toBe(`cumulative-score-run-${runId}.csv`);
            for (const level of expected.levelScores) {
                const record = records.find((candidate) => candidate['Title'] === level.title);
                expect(record?.['Gained this level'], `score of ${level.title}`).toBe(String(level.score));
                expect(record?.['Level max'], `maximum of ${level.title}`).toBe(String(level.maximum));
            }
            expect(records.at(-1)?.['Cumulative max']).toBe(String(MAXIMUM_TOTAL_SCORE));
            expect(records.at(-1)?.['Actual cumulative']).toBe(String(expected.totalScore));
        });

        test('downloads the own points earned against the time per level', async ({ page, browserKey }) => {
            const runId = readChainRecord(browserKey).trainingRunId;
            const { download, records } = await downloadPanelCsv(page, 'Time vs score per level');
            expect(download.fileName).toBe(`time-vs-score-run-${runId}.csv`);
            for (const level of expectedResultOf(browserKey).levelScores) {
                const record = records.find((candidate) => candidate['Title'] === level.title);
                expect(record?.['Points earned'], `score of ${level.title}`).toBe(String(level.score));
            }
        });

        test('names no other trainee on the page', async ({ page }) => {
            const ownName = (await page.locator('.feedback-card__name').innerText()).trim();
            const names = (await page.locator('body').innerText()).match(/User\d+ Generated/g) ?? [];
            expect(names.filter((name) => name !== ownName)).toEqual([]);
        });
    });

    test('refuses to resume the finished run', async ({ page, browserKey }) => {
        await page.goto(`/run/linear/${readChainRecord(browserKey).trainingRunId}/resume`);
        await expect(page).toHaveURL(/\/run$/);
        await expect(page.locator('crczp-abstract-level')).toHaveCount(0);
    });

    test.describe("another trainee's run", () => {
        function otherRunId(browserKey: (typeof BROWSER_KEYS)[number]): number {
            const other = BROWSER_KEYS.find((candidate) => candidate !== browserKey)!;
            return readChainRecord(other).trainingRunId!;
        }

        test('is refused by the backend', async ({ apiAs, browserKey }) => {
            const error = await apiAs('chainTrainee')
                .training.get(`/training-runs/${otherRunId(browserKey)}`)
                .catch((reason: unknown) => reason);
            expect(error).toBeInstanceOf(ApiError);
            expect((error as ApiError).status).toBe(403);
        });

        test('cannot be resumed', async ({ page, browserKey }) => {
            await page.goto(`/run/linear/${otherRunId(browserKey)}/resume`);
            await expect(page).toHaveURL(/\/run$/);
            await expect(page.locator('crczp-abstract-level')).toHaveCount(0);
        });

        test('shows no results of the other trainee', async ({ page, browserKey }) => {
            const other = BROWSER_KEYS.find((candidate) => candidate !== browserKey)!;
            await page.goto(`/run/linear/${otherRunId(browserKey)}/results`);
            await waitForPageReady(page);
            await expect(page.locator('body')).not.toContainText(
                ACCOUNTS[accountFor('chainTrainee', other)].subject,
            );
        });
    });
});
