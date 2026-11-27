import type { Locator } from '@playwright/test';
import { BROWSER_KEYS, type BrowserKey } from '../support/accounts';
import { AnalysisDashboard } from '../support/pages/review/analysis-dashboard';
import {
    checkpointChart,
    levelDifficultyShows,
    ownRunChartShows,
    progressShows,
    scoreAttainmentShows,
    timeVsExpectedShows,
    topWrongAnswersShows,
    wrongAnswersShows,
    type ChartShows,
} from '../support/pages/review/chart-expectations';
import {
    browsersByRank,
    expectedInstanceTotals,
    expectedResultOf,
    MAXIMUM_ASSESSMENT_SCORE,
    MAXIMUM_TOTAL_SCORE,
} from '../support/pages/review/expected-results';
import { expect, test } from '../support/pages/review/review-test';
import { TRAINEE_PLAYS, WRONG_FLAG, WRONG_PASSKEY } from '../support/scenario/trainee-plays';
import {
    SHARED_TRAINING_ANSWERS,
    SHARED_TRAINING_LEVEL_ORDER,
    SHARED_TRAINING_LEVEL_TITLES,
} from '../support/scenario/shared-training-loader';
import { readChainRecord } from '../support/shared-fixture';
import { control, errorDialog, hoverTooltipTrigger, parseCsvRecords, visibleTooltip } from '../support/ui';

const AGGREGATED_PANELS = [
    'Live event feed',
    'Scoreboard',
    'Progress',
    'Current players per level',
    'Score attainment',
    'Difficulty distribution by level',
    'Top wrong answers',
    'Time vs expected per level',
    'Commands',
];
const LEVEL_TITLES = Object.values(SHARED_TRAINING_LEVEL_TITLES);
const ASSESSMENT_QUESTION_TITLES = [
    'Which transport protocol is reliable?',
    'Which protocol gives a remote shell?',
    'Match each port with its protocol.',
];
const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;

const softExpect = expect.configure({ soft: true });

test.describe('linear-instance.results', () => {
    test.use({ account: 'trainingOrganizer' });
    test.describe.configure({ timeout: MERGED_TEST_TIMEOUT_MILLISECONDS });

    async function browsersInOrder(
        rows: Locator,
        reviewRuns: Record<BrowserKey, { traineeName: string }>,
    ): Promise<(BrowserKey | undefined)[]> {
        const texts = await rows.allInnerTexts();
        return texts.map((text) => BROWSER_KEYS.find((browser) => text.includes(reviewRuns[browser].traineeName)));
    }

    function recordOf(records: Record<string, string>[], key: string, value: string) {
        return records.find((record) => record[key] === value);
    }

    function browsersSortedBy(key: (browser: BrowserKey) => number | string): BrowserKey[] {
        return [...BROWSER_KEYS].sort((left, right) => {
            const leftKey = key(left);
            const rightKey = key(right);
            return typeof leftKey === 'number' && typeof rightKey === 'number'
                ? leftKey - rightKey
                : String(leftKey).localeCompare(String(rightKey));
        });
    }

    /** Clicks a sortable header twice and checks the row order matches the direction after each click. */
    async function expectOrderInBothDirections(
        header: Locator,
        rows: Locator,
        reviewRuns: Record<BrowserKey, { traineeName: string }>,
        ascending: BrowserKey[],
        clickTarget: Locator = header,
    ): Promise<void> {
        for (let click = 0; click < 2; click++) {
            const before = (await header.getAttribute('aria-sort')) ?? 'none';
            await clickTarget.click();
            await expect.soft(header, 'sort direction after the click').not.toHaveAttribute('aria-sort', before);
            const direction = await header.getAttribute('aria-sort');
            const expected = direction === 'ascending' ? ascending : [...ascending].reverse();
            await softExpect
                .poll(() => browsersInOrder(rows, reviewRuns), { message: `row order when ${direction}` })
                .toEqual(expected);
        }
    }

    test('checks the dashboard shell and its view switch', async ({ page, shared, checkpoint }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
        await page.goto(`/linear-instance/${shared.trainingInstance.id}/analysis`);

        await test.step('opens on the aggregated view when the address names no view', async () => {
            await expect.soft(dashboard.panel('Scoreboard'), 'scoreboard panel').toBeVisible();
        });

        await test.step('titles the dashboard with the name of the instance', async () => {
            await expect
                .soft(dashboard.title, 'dashboard title')
                .toHaveText(`Analysis of ${shared.trainingInstance.title}`);
        });

        await test.step('offers the aggregated, individual and assessment views', async () => {
            for (const view of ['aggregated', 'individual', 'assessment'] as const) {
                await expect.soft(dashboard.viewOption(view), `${view} option`).toBeVisible();
            }
            await checkpoint(page, 'dashboard with the view switch');
        });

        await test.step('switches between the views and records the view in the address', async () => {
            await dashboard.selectView('individual');
            await expect.soft(page, 'address of the individual view').toHaveURL(/#individual(\/\d+)?$/);
            await expect.soft(dashboard.traineeCard, 'trainee card').toBeVisible();
            await dashboard.selectView('assessment');
            await expect.soft(page, 'address of the assessment view').toHaveURL(/#assessment(\/\d+)?$/);
            await expect.soft(dashboard.assessmentDetail, 'assessment detail').toBeVisible();
            await dashboard.selectView('aggregated');
            await expect.soft(page, 'address of the aggregated view').toHaveURL(/#aggregated$/);
            await expect.soft(dashboard.panel('Scoreboard'), 'scoreboard panel').toBeVisible();
        });
    });

    test('checks the layout, tiles, panels and interactions of the aggregated view', async ({
        page,
        shared,
        reviewRuns,
        checkpoint,
    }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
        await dashboard.open('aggregated');

        await test.step('groups the panels under Live status, Standings, Level analysis and Commands', async () => {
            for (const label of ['Live status', 'Standings', 'Level analysis', 'Commands']) {
                await expect
                    .soft(page.getByRole('heading', { level: 2, name: label, exact: true }), `${label} group`)
                    .toBeVisible();
            }
        });

        await test.step('shows the eight tiles of the data overview', async () => {
            for (const label of [
                'Schedule',
                'Status',
                'Time remaining',
                'Trainees',
                'Most common level',
                'Avg duration',
                'Avg score',
                'Hints & solutions',
            ]) {
                await expect.soft(dashboard.overviewTile(label), `${label} tile`).toBeVisible();
            }
            await checkpoint(page, 'aggregated view with the data overview');
        });

        await test.step('counts the three finished trainees in the Trainees tile', async () => {
            const tile = dashboard.overviewTile('Trainees');
            await expect.soft(tile.locator('.data-overview__tile-value'), 'trainee count').toHaveText('3');
            await expect
                .soft(tile.locator('.data-overview__tile-caption'), 'trainee caption')
                .toHaveText('0 active · 3 done (100%)');
        });

        await test.step('shows the average score of the trainees against the maximum score', async () => {
            const tile = dashboard.overviewTile('Avg score');
            await expect
                .soft(tile.locator('.data-overview__tile-value'), 'average score')
                .toHaveText(String(Math.round(expectedInstanceTotals().averageScore)));
            await expect
                .soft(tile.locator('.data-overview__tile-caption'), 'average score caption')
                .toHaveText(`of ${MAXIMUM_TOTAL_SCORE}`);
        });

        await test.step('shows the hints and solutions the trainees took', async () => {
            const totals = expectedInstanceTotals();
            const tile = dashboard.overviewTile('Hints & solutions');
            await expect
                .soft(tile.locator('.data-overview__tile-value'), 'hints and solutions')
                .toHaveText(`${totals.hints} · ${totals.solutions}`);
            await expect
                .soft(tile.locator('.data-overview__tile-caption'), 'hints and solutions caption')
                .toHaveText('hints · solutions');
        });

        await test.step('shows the average duration of the ended runs', async () => {
            await expect
                .soft(dashboard.overviewTile('Avg duration').locator('.data-overview__tile-value'), 'average duration')
                .not.toHaveText('—');
        });

        await test.step('renders every aggregated panel without a load error', async () => {
            for (const heading of AGGREGATED_PANELS) {
                const panel = dashboard.panel(heading);
                await expect.soft(panel, `${heading} panel`).toBeVisible();
                await expect.soft(dashboard.errorPlaceholder(panel), `${heading} error`).toHaveCount(0);
            }
            await expect.soft(errorDialog(page), 'error dialog').toHaveCount(0);
            await checkpoint(page, 'aggregated panels rendered');
            const aggregatedCharts: Record<string, ChartShows> = {
                Progress: progressShows(BROWSER_KEYS.map((browser) => reviewRuns[browser].traineeName)),
                'Score attainment': scoreAttainmentShows(),
                'Difficulty distribution by level': levelDifficultyShows(),
                'Top wrong answers': topWrongAnswersShows(),
                'Time vs expected per level': timeVsExpectedShows(),
            };
            for (const [heading, chart] of Object.entries(aggregatedCharts)) {
                await checkpointChart(page, checkpoint, dashboard.panel(heading), chart);
            }
        });

        await test.step('lists recent events of the three trainees', async () => {
            const entries = dashboard.panel('Live event feed').getByRole('listitem');
            await expect.soft(entries.first(), 'first feed entry').toBeVisible();
            const names = BROWSER_KEYS.map((browser) => reviewRuns[browser].traineeName);
            for (const text of await entries.allInnerTexts()) {
                expect.soft(names.some((name) => text.includes(name)), `feed entry "${text}" names a trainee`).toBe(true);
            }
        });

        await test.step('shows a step with its active trainee count for every level of the training', async () => {
            const steps = dashboard.panel('Progress').locator('crczp-progress-stepper .progress-stepper-step');
            for (const title of LEVEL_TITLES) {
                const step = steps.filter({ hasText: title });
                await expect.soft(step, `step of ${title}`).toHaveCount(1);
                await expect.soft(step, `active count of ${title}`).toContainText(/\d+ active/);
            }
        });

        await test.step('explains the panel through its info button', async () => {
            const panel = dashboard.panel('Progress');
            await expect.soft(dashboard.infoButton(panel), 'info button').toBeVisible();
            await hoverTooltipTrigger(page, dashboard.infoButton(panel));
            await expect
                .soft(visibleTooltip(page), 'info tooltip')
                .toContainText('Per-trainee progress across levels');
        });

        await test.step('switches the time axis between clock and duration', async () => {
            const panel = dashboard.panel('Progress');
            const clock = panel.locator('mat-button-toggle').filter({ hasText: 'Clock' });
            const duration = panel.locator('mat-button-toggle').filter({ hasText: 'Duration' });
            await duration.locator('button').click();
            await expect.soft(duration, 'duration toggle').toHaveClass(/mat-button-toggle-checked/);
            await clock.locator('button').click();
            await expect.soft(clock, 'clock toggle').toHaveClass(/mat-button-toggle-checked/);
        });

        await test.step('offers the six sort criteria and applies the chosen one', async () => {
            const panel = dashboard.panel('Progress');
            await panel.getByRole('button', { name: /Sort:/ }).click();
            for (const label of [
                'Trainee name',
                'Current level',
                'Score',
                'Lag time',
                'Lag percentage',
                'Run start',
            ]) {
                await expect.soft(page.getByRole('menuitem', { name: label, exact: true }), `${label} criterion`).toBeVisible();
            }
            await page.getByRole('menuitem', { name: 'Score', exact: true }).click();
            await expect.soft(panel.getByRole('button', { name: /Sort:/ }), 'chosen criterion').toContainText('Score');
        });

        await test.step('reverses the sort direction with the direction button', async () => {
            const panel = dashboard.panel('Progress');
            const icon = panel.locator('.chart-controls__sort-direction mat-icon');
            const before = await icon.innerText();
            await panel.locator('.chart-controls__sort-direction').click();
            await expect.soft(icon, 'direction icon').not.toHaveText(before.trim());
        });

        await test.step('disables Clear while no trainee is marked as favourite', async () => {
            await expect.soft(control(dashboard.panel('Progress'), 'Clear'), 'Clear control').toBeDisabled();
        });

        await test.step('shows the empty message because every trainee finished', async () => {
            await expect
                .soft(dashboard.emptyPlaceholder(dashboard.panel('Current players per level')), 'empty placeholder')
                .toBeVisible();
        });

        await test.step('offers a pie and a bar presentation of the wrong answers', async () => {
            const panel = dashboard.panel('Top wrong answers');
            const bar = panel.locator('mat-button-toggle').filter({ hasText: 'Bar' });
            const pie = panel.locator('mat-button-toggle').filter({ hasText: 'Pie' });
            await bar.locator('button').click();
            await expect.soft(bar, 'bar toggle').toHaveClass(/mat-button-toggle-checked/);
            await pie.locator('button').click();
            await expect.soft(pie, 'pie toggle').toHaveClass(/mat-button-toggle-checked/);
        });

        await test.step('shows the empty message because the trainees issued no commands', async () => {
            await expect
                .soft(dashboard.emptyPlaceholder(dashboard.panel('Commands')), 'empty placeholder')
                .toBeVisible();
        });
    });

    test('checks the scoreboard of the aggregated view', async ({ page, shared, reviewRuns }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
        await dashboard.open('aggregated');
        const panel = dashboard.panel('Scoreboard');
        const rows = panel.locator('tbody tr[data-run-id]');

        await test.step('ranks the trainees by total score, highest first', async () => {
            await expect.soft(rows, 'scoreboard rows').toHaveCount(BROWSER_KEYS.length);
            await softExpect
                .poll(() => browsersInOrder(rows, reviewRuns), { message: 'scoreboard order' })
                .toEqual(browsersByRank());
        });

        await test.step('shows rank, name, finished state and score of every trainee', async () => {
            const ranking = browsersByRank();
            for (const browser of BROWSER_KEYS) {
                const row = dashboard.scoreboardRow(reviewRuns[browser].runId);
                await expect.soft(row, `row of ${browser}`).toContainText(reviewRuns[browser].traineeName);
                await expect
                    .soft(row.locator('td').first(), `rank of ${browser}`)
                    .toHaveText(String(ranking.indexOf(browser) + 1));
                await expect.soft(row.locator('crczp-run-state-chip'), `state of ${browser}`).toHaveText('Finished');
                await expect
                    .soft(row, `score of ${browser}`)
                    .toContainText(`${expectedResultOf(browser).totalScore} / ${MAXIMUM_TOTAL_SCORE}`);
            }
        });

        await test.step('downloads the scoreboard as scoreboard.csv with a row per trainee', async () => {
            const { download, records } = await dashboard.downloadCsvRecords(panel);
            expect.soft(download.fileName, 'file name').toBe('scoreboard.csv');
            expect.soft(download.size, 'file size').toBeGreaterThan(0);
            const ranking = browsersByRank();
            for (const browser of BROWSER_KEYS) {
                const expected = expectedResultOf(browser);
                const record = recordOf(records, 'Email', reviewRuns[browser].traineeMail);
                expect.soft(record, `scoreboard row of ${browser}`).toBeDefined();
                expect.soft(record?.['Rank'], `rank of ${browser}`).toBe(String(ranking.indexOf(browser) + 1));
                expect.soft(record?.['Trainee name'], `name of ${browser}`).toBe(reviewRuns[browser].traineeName);
                expect.soft(record?.['State'], `state of ${browser}`).toBe('Finished');
                expect.soft(record?.['Training score'], `training score of ${browser}`).toBe(String(expected.trainingScore));
                expect.soft(record?.['Assessment score'], `assessment score of ${browser}`).toBe(String(expected.assessmentScore));
                expect.soft(record?.['Max score'], `maximum score of ${browser}`).toBe(String(MAXIMUM_TOTAL_SCORE));
                expect
                    .soft(Number(record?.['Score %']), `score percentage of ${browser}`)
                    .toBeCloseTo((expected.totalScore / MAXIMUM_TOTAL_SCORE) * 100, 0);
            }
        });

        for (const [header, order] of [
            ['#', (browser: BrowserKey) => browsersByRank().indexOf(browser)],
            ['Score', (browser: BrowserKey) => expectedResultOf(browser).totalScore],
        ] as const) {
            await test.step(`orders the trainees by ${header} in both directions`, async () => {
                const headerCell = panel.getByRole('columnheader', { name: header, exact: true });
                await expectOrderInBothDirections(headerCell, rows, reviewRuns, browsersSortedBy(order));
            });
        }

        await test.step('orders the trainees by name in both directions', async () => {
            const headerCell = panel.getByRole('columnheader', { name: 'Trainee', exact: true });
            await expectOrderInBothDirections(
                headerCell,
                rows,
                reviewRuns,
                browsersSortedBy((browser) => reviewRuns[browser].traineeName),
            );
        });

        for (const header of ['State', 'Time']) {
            await test.step(`marks the ${header} column as sorted when its header is clicked`, async () => {
                const headerCell = panel.getByRole('columnheader', { name: header, exact: true });
                await headerCell.click();
                await expect.soft(headerCell, `${header} header sort`).toHaveAttribute('aria-sort', /ascending|descending/);
                await expect.soft(rows, 'scoreboard rows').toHaveCount(BROWSER_KEYS.length);
            });
        }
    });

    test('checks the chart CSV downloads of the aggregated view', async ({ page, shared, reviewRuns }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
        await dashboard.open('aggregated');

        await test.step('downloads score-attainment.csv with the score of every trainee', async () => {
            const { download, records } = await dashboard.downloadCsvRecords(dashboard.panel('Score attainment'));
            expect.soft(download.fileName, 'file name').toBe('score-attainment.csv');
            for (const browser of BROWSER_KEYS) {
                const record = recordOf(records, 'Email', reviewRuns[browser].traineeMail);
                expect.soft(record, `score attainment row of ${browser}`).toBeDefined();
                expect.soft(record?.['Trainee'], `name of ${browser}`).toBe(reviewRuns[browser].traineeName);
                expect.soft(record?.['Total score'], `total score of ${browser}`).toBe(String(expectedResultOf(browser).totalScore));
                expect.soft(record?.['Max score'], `maximum score of ${browser}`).toBe(String(MAXIMUM_TOTAL_SCORE));
                expect.soft(record?.['Run state'], `run state of ${browser}`).toMatch(/finished/i);
            }
        });

        await test.step('downloads the level counts of wrong answers, hints and solutions', async () => {
            const { download, records } = await dashboard.downloadCsvRecords(
                dashboard.panel('Difficulty distribution by level'),
            );
            expect.soft(download.fileName, 'file name').toBe(`level-difficulty-${shared.trainingInstance.id}.csv`);
            const totals = expectedInstanceTotals();
            const first = recordOf(records, 'Level name', SHARED_TRAINING_LEVEL_TITLES.firstTraining);
            const second = recordOf(records, 'Level name', SHARED_TRAINING_LEVEL_TITLES.secondTraining);
            expect.soft(first?.['Started trainees'], 'first level started').toBe(String(BROWSER_KEYS.length));
            expect.soft(first?.['Wrong answers'], 'first level wrong answers').toBe(String(totals.wrongFlagAnswers));
            expect.soft(first?.['Hints'], 'first level hints').toBe(String(totals.hints));
            expect.soft(first?.['Solution'], 'first level solutions').toBe('0');
            expect.soft(second?.['Started trainees'], 'second level started').toBe(String(BROWSER_KEYS.length));
            expect.soft(second?.['Wrong answers'], 'second level wrong answers').toBe('0');
            expect.soft(second?.['Hints'], 'second level hints').toBe('0');
            expect
                .soft(second?.['Solution'], 'second level solutions')
                .toBe(
                    String(BROWSER_KEYS.filter((browser) => TRAINEE_PLAYS[browser].showsSolutionOnSecondTraining).length),
                );
            const variant = recordOf(records, 'Level name', SHARED_TRAINING_LEVEL_TITLES.variantTraining);
            expect.soft(variant?.['Started trainees'], 'variant level started').toBe(String(BROWSER_KEYS.length));
            expect.soft(variant?.['Wrong answers'], 'variant level wrong answers').toBe('0');
            expect.soft(variant?.['Hints'], 'variant level hints').toBe('0');
            expect.soft(variant?.['Solution'], 'variant level solutions').toBe(String(BROWSER_KEYS.length));
        });

        await test.step('downloads top-wrong-answers.csv with one row per wrong submission', async () => {
            const { download, records } = await dashboard.downloadCsvRecords(dashboard.panel('Top wrong answers'));
            expect.soft(download.fileName, 'file name').toBe('top-wrong-answers.csv');
            expect.soft(records, 'wrong submissions').toHaveLength(expectedInstanceTotals().wrongAnswers);
            for (const record of records) {
                const isPasskey = record['Answer'] === WRONG_PASSKEY;
                if (!isPasskey) {
                    expect.soft(record['Answer'], 'wrong flag').toMatch(new RegExp(`^${WRONG_FLAG}-\\d+$`));
                }
                expect
                    .soft(record['Level'], `level of "${record['Answer']}"`)
                    .toBe(isPasskey ? SHARED_TRAINING_LEVEL_TITLES.access : SHARED_TRAINING_LEVEL_TITLES.firstTraining);
            }
            for (const browser of BROWSER_KEYS) {
                const submissions = records.filter((record) => record['Trainee'] === reviewRuns[browser].traineeName);
                expect
                    .soft(submissions, `wrong submissions of ${browser}`)
                    .toHaveLength(expectedResultOf(browser).wrongAnswers);
            }
        });

        await test.step('downloads time-vs-expected-per-level.csv with the level visits of every trainee', async () => {
            const { download, records } = await dashboard.downloadCsvRecords(
                dashboard.panel('Time vs expected per level'),
            );
            expect.soft(download.fileName, 'file name').toBe('time-vs-expected-per-level.csv');
            for (const browser of BROWSER_KEYS) {
                const visits = records.filter((record) => record['Email'] === reviewRuns[browser].traineeMail);
                expect
                    .soft(
                        visits.map((visit) => visit['Level']),
                        `level visits of ${browser}`,
                    )
                    .toEqual(
                        expect.arrayContaining([
                            SHARED_TRAINING_LEVEL_TITLES.firstTraining,
                            SHARED_TRAINING_LEVEL_TITLES.secondTraining,
                        ]),
                    );
            }
        });
    });

    test('checks the trainee table and the selection of the individual view', async ({
        page,
        shared,
        reviewRuns,
        checkpoint,
    }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
        const traineeTable = page.locator('crczp-trainee-table');
        await dashboard.open('individual');

        await test.step('lists the three trainees and selects the first one', async () => {
            await expect.soft(dashboard.traineeTableRows, 'trainee rows').toHaveCount(BROWSER_KEYS.length);
            await expect.soft(traineeTable, 'trainee count').toContainText(`${BROWSER_KEYS.length} in this run`);
            await expect.soft(dashboard.traineeCard, 'trainee card').not.toContainText('Select a trainee');
            for (const header of ['Trainee', 'Time', 'Current level', 'In level', 'Score']) {
                await expect
                    .soft(traineeTable.getByRole('columnheader', { name: header, exact: true }), `${header} column`)
                    .toBeVisible();
            }
            for (const browser of BROWSER_KEYS) {
                await expect
                    .soft(dashboard.traineeTableRow(reviewRuns[browser].traineeName), `row of ${browser}`)
                    .toHaveCount(1);
            }
            await checkpoint(page, 'individual view with the first trainee selected');
        });

        await test.step('shows the total score and a finished marker of every trainee in the table', async () => {
            for (const browser of BROWSER_KEYS) {
                const row = dashboard.traineeTableRow(reviewRuns[browser].traineeName);
                await expect
                    .soft(row.locator('td').last(), `score of ${browser}`)
                    .toHaveText(String(expectedResultOf(browser).totalScore));
                await expect.soft(row.locator('crczp-run-state-chip'), `state of ${browser}`).toHaveText('Finished');
            }
        });

        await test.step('orders the trainees by score in both directions', async () => {
            const headerCell = traineeTable.getByRole('columnheader', { name: 'Score', exact: true });
            await expectOrderInBothDirections(
                headerCell,
                dashboard.traineeTableRows,
                reviewRuns,
                browsersSortedBy((browser) => expectedResultOf(browser).totalScore),
            );
        });

        await test.step('orders the trainees by name in both directions', async () => {
            const headerCell = traineeTable.getByRole('columnheader', { name: 'Trainee', exact: true });
            await expectOrderInBothDirections(
                headerCell,
                dashboard.traineeTableRows,
                reviewRuns,
                browsersSortedBy((browser) => reviewRuns[browser].traineeName),
            );
        });

        for (const header of ['Time', 'Current level', 'In level']) {
            await test.step(`marks the ${header} column as sorted when its header is clicked`, async () => {
                const headerCell = traineeTable.getByRole('columnheader', { name: header, exact: true });
                await headerCell.click();
                await expect.soft(headerCell, `${header} header sort`).toHaveAttribute('aria-sort', /ascending|descending/);
                await expect.soft(dashboard.traineeTableRows, 'trainee rows').toHaveCount(BROWSER_KEYS.length);
            });
        }

        await test.step('selects a trainee by clicking the row and records the run in the address', async () => {
            const run = reviewRuns.chromium;
            await dashboard.traineeTableRow(run.traineeName).click();
            await expect.soft(page, 'address with the run').toHaveURL(new RegExp(`#individual/${run.runId}$`));
            await expect.soft(dashboard.traineeCard, 'card name').toContainText(run.traineeName);
            await expect.soft(dashboard.traineeCard, 'card email').toContainText(run.traineeMail);
            await checkpoint(page, 'trainee selected in the individual view');
        });

        await test.step('selects the trainee named by the run in the address', async () => {
            await dashboard.open('individual', reviewRuns.firefox.runId);
            await expect.soft(dashboard.traineeCard, 'card name').toContainText(reviewRuns.firefox.traineeName);
        });
    });

    test('checks the trainee card of each browser trainee in the individual view', async ({
        page,
        apiAs,
        shared,
        reviewRuns,
    }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);

        await test.step('gives every trainee a different variant answer, which the platform holds as that run\'s answer', async () => {
            const submitted = BROWSER_KEYS.map((browser) => readChainRecord(browser).variantAnswer);
            expect.soft(submitted.every((answer) => answer !== undefined && answer !== ''), 'every trainee answered').toBe(true);
            expect.soft(new Set(submitted).size, 'distinct variant answers').toBe(BROWSER_KEYS.length);
            for (const browser of BROWSER_KEYS) {
                const answers = await apiAs('trainingOrganizer').training.get<
                    { level_title: string; correct_answer: string }[]
                >(`/training-runs/${reviewRuns[browser].runId}/answers`);
                const variantAnswer = answers.find(
                    (answer) => answer.level_title === SHARED_TRAINING_LEVEL_TITLES.variantTraining,
                );
                expect
                    .soft(variantAnswer?.correct_answer, `variant answer of ${browser}`)
                    .toBe(readChainRecord(browser).variantAnswer);
            }
        });

        for (const browser of BROWSER_KEYS) {
            await dashboard.open('individual', reviewRuns[browser].runId);
            await expect
                .soft(dashboard.traineeCard, `trainee card of the ${browser} trainee loaded`)
                .toContainText(reviewRuns[browser].traineeName);
            const expected = expectedResultOf(browser);

            await test.step(`summarises the run of the ${browser} trainee on the trainee card`, async () => {
                await expect.soft(dashboard.traineeCardStat('State'), 'state').toContainText('Finished');
                await expect.soft(dashboard.traineeCardStat('Score'), 'score').toContainText(String(expected.totalScore));
                await expect
                    .soft(dashboard.traineeCardStat('Score'), 'assessment score')
                    .toContainText(`${expected.assessmentScore} assessment`);
                await expect.soft(dashboard.traineeCardStat('Levels'), 'levels').toHaveText(/(\d+)\/\1/);
                await expect.soft(dashboard.traineeCardStat('Wrong'), 'wrong answers').toContainText(String(expected.wrongAnswers));
                await expect.soft(dashboard.traineeCardStat('Hints'), 'hints').toContainText(String(expected.hints));
                await expect.soft(dashboard.traineeCardStat('Solutions'), 'solutions').toContainText(String(expected.solutions));
            });

            await test.step(`breaks the score of the ${browser} trainee down by level on the trainee card`, async () => {
                for (const level of expected.levelScores) {
                    await expect
                        .soft(
                            dashboard.traineeCardLevels
                                .filter({ hasText: level.title })
                                .locator('.trainee-card__level-score'),
                            `score of ${level.title}`,
                        )
                        .toHaveText(`${level.score}/${level.maximum}`);
                }
            });

            await test.step(`shows the variant level of the ${browser} trainee solved`, async () => {
                await expect
                    .soft(dashboard.traineeCardStat('Levels'), 'levels')
                    .toContainText(`${SHARED_TRAINING_LEVEL_ORDER.length}/${SHARED_TRAINING_LEVEL_ORDER.length}`);
                await expect
                    .soft(
                        dashboard.traineeCardLevels.filter({ hasText: SHARED_TRAINING_LEVEL_TITLES.variantTraining }),
                        'variant level',
                    )
                    .toContainText('1 solution');
            });

            if (browser === 'webkit') {
                await test.step('lists the wrong answers, hints and solutions on the level rows of the trainee card', async () => {
                    const first = dashboard.traineeCardLevels.filter({
                        hasText: SHARED_TRAINING_LEVEL_TITLES.firstTraining,
                    });
                    await expect.soft(first, 'first training level wrong answers').toContainText('2 wrong answers');
                    await expect.soft(first, 'first training level hints').toContainText('2 hints');
                });
            }
            if (browser === 'firefox') {
                await test.step('lists the wrong answers, hints and solutions on the level rows of the trainee card', async () => {
                    const second = dashboard.traineeCardLevels.filter({
                        hasText: SHARED_TRAINING_LEVEL_TITLES.secondTraining,
                    });
                    await expect.soft(second, 'second training level solutions').toContainText('1 solution');
                });
            }
        }
    });

    test('checks the charts and CSV downloads of the selected run in the individual view', async ({
        page,
        shared,
        reviewRuns,
        checkpoint,
    }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
        await dashboard.open('individual', reviewRuns.chromium.runId);

        await test.step('renders the charts of the selected run without a load error', async () => {
            for (const heading of [
                'Cumulative score',
                'Time vs score per level',
                'Wrong answers',
                'Event timeline',
                'Commands log',
            ]) {
                const panel = dashboard.panel(heading);
                await expect.soft(panel, `${heading} panel`).toBeVisible();
                await expect.soft(dashboard.errorPlaceholder(panel), `${heading} error`).toHaveCount(0);
            }
            await checkpoint(page, 'individual charts of one run');
            const result = expectedResultOf('chromium');
            const individualCharts: Record<string, ChartShows> = {
                'Cumulative score': ownRunChartShows(result)['crczp-cumulative-score-chart']!,
                'Time vs score per level': ownRunChartShows(result)['crczp-time-vs-score-chart']!,
                'Wrong answers': wrongAnswersShows(result),
                'Event timeline': ownRunChartShows(result)['crczp-event-timeline-chart']!,
            };
            for (const [heading, chart] of Object.entries(individualCharts)) {
                await checkpointChart(page, checkpoint, dashboard.panel(heading), chart);
            }
        });

        await test.step('shows the empty message in the commands log because the trainee issued no commands', async () => {
            const panel = dashboard.panel('Commands log');
            await expect.soft(dashboard.errorPlaceholder(panel), 'commands log error').toHaveCount(0);
            await expect.soft(panel.locator('tbody tr'), 'commands log rows').toHaveCount(0);
        });

        for (const browser of ['chromium', 'firefox', 'webkit'] as const) {
            const run = reviewRuns[browser];
            const expected = expectedResultOf(browser);
            if (browser !== 'chromium') {
                await dashboard.open('individual', run.runId);
                await expect
                    .soft(dashboard.traineeCard, `trainee card of the ${browser} trainee loaded`)
                    .toContainText(run.traineeName);
            }

            await test.step(`downloads the cumulative score of the ${browser} trainee level by level`, async () => {
                const { download, records } = await dashboard.downloadCsvRecords(dashboard.panel('Cumulative score'));
                expect.soft(download.fileName, 'file name').toBe(`cumulative-score-run-${run.runId}.csv`);
                for (const level of expected.levelScores) {
                    const record = recordOf(records, 'Title', level.title);
                    expect.soft(record?.['Gained this level'], `score of ${level.title}`).toBe(String(level.score));
                    expect.soft(record?.['Level max'], `maximum of ${level.title}`).toBe(String(level.maximum));
                }
                expect.soft(records.at(-1)?.['Cumulative max'], 'cumulative maximum').toBe(String(MAXIMUM_TOTAL_SCORE));
                expect.soft(records.at(-1)?.['Actual cumulative'], 'actual cumulative').toBe(String(expected.totalScore));
            });

            await test.step(`downloads the points earned by the ${browser} trainee against the time per level`, async () => {
                const { download, records } = await dashboard.downloadCsvRecords(
                    dashboard.panel('Time vs score per level'),
                );
                expect.soft(download.fileName, 'file name').toBe(`time-vs-score-run-${run.runId}.csv`);
                for (const level of expected.levelScores) {
                    expect
                        .soft(recordOf(records, 'Title', level.title)?.['Points earned'], `score of ${level.title}`)
                        .toBe(String(level.score));
                }
            });

            await test.step(`downloads the event timeline of the ${browser} trainee with its wrong answers and hints`, async () => {
                const { download, records } = await dashboard.downloadCsvRecords(dashboard.panel('Event timeline'));
                expect.soft(download.fileName, 'file name').toBe(`event-timeline-run-${run.runId}.csv`);
                expect.soft(records.length, 'timeline records').toBeGreaterThan(0);
                expect
                    .soft(records.every((record) => record['Trainee'] === run.traineeName), 'every record names the trainee')
                    .toBe(true);
                expect
                    .soft(records.filter((record) => record['Answer'].startsWith(WRONG_FLAG)), 'wrong flag records')
                    .toHaveLength(expected.wrongFlagAnswers);
                expect
                    .soft(records.filter((record) => record['Hint'] !== ''), 'hint records')
                    .toHaveLength(expected.hints);
            });

            if (browser === 'firefox') {
                await test.step('lists only the wrong passkey of a trainee who made no wrong flag submission', async () => {
                    const panel = dashboard.panel('Wrong answers');
                    const { records } = await dashboard.downloadCsvRecords(panel);
                    expect.soft(records, 'wrong answers').toHaveLength(expectedResultOf('firefox').wrongAnswers);
                    expect.soft(records.map((record) => record['Answer']), 'answers').toEqual([WRONG_PASSKEY]);
                    expect
                        .soft(records.map((record) => record['Level']), 'levels')
                        .toEqual([SHARED_TRAINING_LEVEL_TITLES.access]);
                    await expect
                        .soft(panel, 'wrong answers panel')
                        .not.toContainText('No wrong answers from this trainee');
                });
            }

            if (browser === 'webkit') {
                await test.step('downloads the wrong answers of the selected trainee as trainee-wrong-answers.csv', async () => {
                    const panel = dashboard.panel('Wrong answers');
                    const { download, records } = await dashboard.downloadCsvRecords(panel);
                    expect.soft(download.fileName, 'file name').toBe('trainee-wrong-answers.csv');
                    expect.soft(records, 'wrong answers').toHaveLength(expectedResultOf('webkit').wrongAnswers);
                    expect.soft(records.map((record) => record['Attempt']), 'attempts').toEqual(['0', '1', '2']);
                    await expect
                        .soft(panel.locator('mat-button-toggle').filter({ hasText: 'Pie' }), 'pie toggle')
                        .toBeVisible();
                    await expect
                        .soft(panel.locator('mat-button-toggle').filter({ hasText: 'Bar' }), 'bar toggle')
                        .toBeVisible();
                });
            }
        }
    });

    test('checks the assessment details, questions and download of the assessment view', async ({
        page,
        shared,
        reviewRuns,
        checkpoint,
    }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
        await dashboard.open('assessment');

        await test.step('shows the assessment with its kind, title and statistics', async () => {
            const detail = dashboard.assessmentDetail;
            await expect.soft(detail, 'assessment title').toContainText(SHARED_TRAINING_LEVEL_TITLES.assessment);
            await expect.soft(detail.locator('.assessment-detail--kind'), 'assessment kind').toHaveText('TEST');
            await expect.soft(dashboard.assessmentStat('Takers'), 'takers').toContainText(String(BROWSER_KEYS.length));
            await expect
                .soft(dashboard.assessmentStat('Questions'), 'questions')
                .toContainText(String(ASSESSMENT_QUESTION_TITLES.length));
            await expect
                .soft(dashboard.assessmentStat('Max points'), 'maximum points')
                .toContainText(String(MAXIMUM_ASSESSMENT_SCORE));
            await checkpoint(page, 'assessment view');
        });

        await test.step('shows the mean points of the takers as average points', async () => {
            const mean =
                BROWSER_KEYS.reduce((sum, browser) => sum + expectedResultOf(browser).assessmentScore, 0) /
                BROWSER_KEYS.length;
            await expect
                .soft(dashboard.assessmentStat('Average points'), 'average points')
                .toContainText(String(Math.round(mean * 10) / 10));
        });

        await test.step('disables the assessment picker because the training has one assessment', async () => {
            await expect
                .soft(page.getByRole('button', { name: 'Select assessment' }), 'assessment picker')
                .toBeDisabled();
        });

        await test.step('lists the three questions with their types', async () => {
            const frames = dashboard.questionFrames;
            await expect.soft(frames, 'question frames').toHaveCount(ASSESSMENT_QUESTION_TITLES.length);
            const kinds = ['FFQ', 'MCQ', 'EMI'];
            for (const [index, title] of ASSESSMENT_QUESTION_TITLES.entries()) {
                await expect.soft(frames.nth(index), `question ${index + 1}`).toContainText(title);
                await expect
                    .soft(frames.nth(index).locator('.question-frame--tag'), `type of question ${index + 1}`)
                    .toHaveText(kinds[index] ?? '');
            }
        });

        await test.step('shows the trainees who chose each option of the multiple choice question', async () => {
            const frame = dashboard.questionFrames.nth(1);
            for (const option of ['SSH', 'DNS', 'NTP']) {
                const surface = dashboard.answerSurfaces(frame).filter({ hasText: option });
                const expectedChoosers = BROWSER_KEYS.filter(
                    (browser) => TRAINEE_PLAYS[browser].assessment.multipleChoice === option,
                );
                await expect.soft(dashboard.faces(surface), `choosers of ${option}`).toHaveCount(expectedChoosers.length);
                for (const browser of expectedChoosers) {
                    await expect
                        .soft(
                            dashboard
                                .faces(surface)
                                .and(surface.getByRole('button', { name: reviewRuns[browser].traineeName, exact: true })),
                            `${browser} among the choosers of ${option}`,
                        )
                        .toHaveCount(1);
                }
            }
        });

        await test.step('shows the trainees who chose each cell of the extended matching question', async () => {
            const cells = dashboard.questionFrames.nth(2).locator('crczp-emi-body crczp-answer-surface');
            await expect.soft(cells, 'matching cells').toHaveCount(4);
            const expectedFaces = [2, 1, 1, 2];
            for (const [index, count] of expectedFaces.entries()) {
                await expect.soft(dashboard.faces(cells.nth(index)), `cell ${index}`).toHaveCount(count);
            }
        });

        await test.step('filters the answers of the free form question', async () => {
            const frame = dashboard.questionFrames.nth(0);
            const filter = frame.getByRole('searchbox', { name: 'Filter answers' });
            await expect
                .soft(
                    dashboard.answerSurfaces(frame).filter({ hasText: SHARED_TRAINING_ANSWERS.freeFormAnswer }),
                    'free form answer',
                )
                .toBeVisible();
            await filter.fill('udp');
            await expect.soft(dashboard.answerSurfaces(frame), 'answers matching udp').toHaveCount(1);
            await expect.soft(dashboard.answerSurfaces(frame).first(), 'matching answer').toContainText('udp');
            await filter.fill('zzzz');
            await expect.soft(frame, 'no match message').toContainText('No matching answers.');
            await filter.fill('');
            await expect.soft(dashboard.answerSurfaces(frame), 'answers after clearing').toHaveCount(2);
        });

        await test.step('highlights the choosers of an answer when the answer is clicked', async () => {
            const frame = dashboard.questionFrames.nth(1);
            const surface = dashboard.answerSurfaces(frame).filter({ hasText: 'SSH' });
            await surface.click();
            await expect.soft(frame.locator('.mcq-body--option--active'), 'active option').toHaveCount(1);
            await surface.click();
            await expect.soft(frame.locator('.mcq-body--option--active'), 'active option after the second click').toHaveCount(0);
        });

        await test.step('downloads the assessment as a CSV named after it with the answer of every trainee', async () => {
            const download = await dashboard.downloadCsv(dashboard.assessmentDetail);
            expect.soft(download.fileName, 'file name').toBe(`${SHARED_TRAINING_LEVEL_TITLES.assessment}.csv`);
            expect.soft(download.size, 'file size').toBeGreaterThan(0);
            const records = parseCsvRecords(download.content);
            expect.soft(records, 'answer rows').toHaveLength(BROWSER_KEYS.length * ASSESSMENT_QUESTION_TITLES.length);
            for (const browser of BROWSER_KEYS) {
                const play = TRAINEE_PLAYS[browser].assessment;
                const rows = records.filter((record) => record['Email'] === reviewRuns[browser].traineeMail);
                expect.soft(rows.map((row) => row['Question #']), `question numbers of ${browser}`).toEqual(['1', '2', '3']);
                expect.soft(rows.map((row) => row['Type']), `question types of ${browser}`).toEqual(['FFQ', 'MCQ', 'EMI']);
                expect.soft(rows[0]?.['Answer'], `free form answer of ${browser}`).toBe(play.freeForm);
                expect.soft(rows[1]?.['Answer'], `multiple choice answer of ${browser}`).toBe(play.multipleChoice);
                for (const [statement, option] of Object.entries(play.extendedMatching)) {
                    expect
                        .soft(rows[2]?.['Answer'], `matching answer of ${browser}`)
                        .toContain(`${statement} → ${option}`);
                }
                for (const question of expectedResultOf(browser).questionScores) {
                    const row = recordOf(rows, 'Question', question.text);
                    expect.soft(row, `row of "${question.text}" for ${browser}`).toBeDefined();
                    expect.soft(row?.['Answered'], `answered "${question.text}" for ${browser}`).toBe('Yes');
                    expect
                        .soft(row?.['Correctness'], `correctness of "${question.text}" for ${browser}`)
                        .toBe(question.correct ? 'Correct' : 'Incorrect');
                    expect.soft(row?.['Points gained'], `points of "${question.text}" for ${browser}`).toBe(String(question.score));
                    expect.soft(row?.['Max points'], `maximum of "${question.text}" for ${browser}`).toBe(String(question.maximum));
                }
                expect
                    .soft(
                        rows.reduce((sum, row) => sum + Number(row['Points gained']), 0),
                        `assessment points of ${browser}`,
                    )
                    .toBe(expectedResultOf(browser).assessmentScore);
            }
        });
    });

    test('checks the roster of the assessment view', async ({ page, shared, reviewRuns }) => {
        const dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
        await dashboard.open('assessment');

        await test.step('lists every trainee in the roster with points, correct and answered counts', async () => {
            await expect.soft(dashboard.rosterRows, 'roster rows').toHaveCount(BROWSER_KEYS.length);
            for (const browser of BROWSER_KEYS) {
                const expected = expectedResultOf(browser);
                const row = dashboard.rosterRow(reviewRuns[browser].traineeName);
                await expect
                    .soft(row.getByRole('gridcell', { name: `Points gained ${expected.assessmentScore}` }), `points of ${browser}`)
                    .toBeVisible();
                await expect
                    .soft(
                        row.getByRole('gridcell', {
                            name: `Whole questions correct ${expected.correctAssessmentQuestions}/${ASSESSMENT_QUESTION_TITLES.length}`,
                        }),
                        `correct questions of ${browser}`,
                    )
                    .toBeVisible();
                await expect
                    .soft(
                        row.getByRole('gridcell', {
                            name: `Questions answered ${ASSESSMENT_QUESTION_TITLES.length}/${ASSESSMENT_QUESTION_TITLES.length}`,
                        }),
                        `answered questions of ${browser}`,
                    )
                    .toBeVisible();
            }
        });

        await test.step('orders the roster by points in both directions', async () => {
            const header = dashboard.rosterHeader(/Pts|Points gained/);
            await expectOrderInBothDirections(
                header,
                dashboard.rosterRows,
                reviewRuns,
                browsersSortedBy((browser) => expectedResultOf(browser).assessmentScore),
                header.getByRole('button'),
            );
        });

        await test.step('orders the roster by trainee name in both directions', async () => {
            const header = dashboard.rosterHeader(/^Trainee/);
            await expectOrderInBothDirections(
                header,
                dashboard.rosterRows,
                reviewRuns,
                browsersSortedBy((browser) => reviewRuns[browser].traineeName),
                header.getByRole('button'),
            );
        });

        for (const label of [/Correct/, /Answered/]) {
            await test.step(`marks the roster column ${label.source} as sorted when its header is clicked`, async () => {
                const header = dashboard.rosterHeader(label);
                await header.getByRole('button').click();
                await expect.soft(header, 'roster header sort').toHaveAttribute('aria-sort', /ascending|descending/);
                await expect.soft(dashboard.rosterRows, 'roster rows').toHaveCount(BROWSER_KEYS.length);
            });
        }

        await test.step('focuses a trainee by clicking the roster row and records the run in the address', async () => {
            const run = reviewRuns.webkit;
            await dashboard.rosterRow(run.traineeName).click();
            await expect.soft(page, 'address with the run').toHaveURL(new RegExp(`#assessment/${run.runId}$`));
            await expect
                .soft(dashboard.rosterRow(run.traineeName), 'focused roster row')
                .toHaveAttribute('aria-selected', 'true');
        });
    });
});
