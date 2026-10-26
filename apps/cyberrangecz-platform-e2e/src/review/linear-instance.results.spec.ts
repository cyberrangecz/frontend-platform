import { expectRedirectedAway } from '../support/route-guard';
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

test.describe('linear-instance.results', () => {
    test.use({ account: 'trainingOrganizer' });
    test.describe.configure({ timeout: 120_000 });

    let dashboard: AnalysisDashboard;

    test.beforeEach(({ page, shared }) => {
        dashboard = new AnalysisDashboard(page, shared.trainingInstance.id);
    });

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
            await expect(header).not.toHaveAttribute('aria-sort', before);
            const direction = await header.getAttribute('aria-sort');
            const expected = direction === 'ascending' ? ascending : [...ascending].reverse();
            await expect.poll(() => browsersInOrder(rows, reviewRuns)).toEqual(expected);
        }
    }

    test.describe('dashboard', () => {
        test('titles the dashboard with the name of the instance', async ({ shared }) => {
            await dashboard.open();
            await expect(dashboard.title).toHaveText(`Analysis of ${shared.trainingInstance.title}`);
        });

        test('offers the aggregated, individual and assessment views', async ({ checkpoint, page }) => {
            await dashboard.open();
            for (const view of ['aggregated', 'individual', 'assessment'] as const) {
                await expect(dashboard.viewOption(view)).toBeVisible();
            }
            await checkpoint(page, 'dashboard with the view switch');
        });

        test('opens on the aggregated view when the address names no view', async ({ page, shared }) => {
            await page.goto(`/linear-instance/${shared.trainingInstance.id}/analysis`);
            await expect(dashboard.panel('Scoreboard')).toBeVisible();
        });

        test('switches between the views and records the view in the address', async ({ page }) => {
            await dashboard.open();
            await dashboard.selectView('individual');
            await expect(page).toHaveURL(/#individual(\/\d+)?$/);
            await expect(dashboard.traineeCard).toBeVisible();
            await dashboard.selectView('assessment');
            await expect(page).toHaveURL(/#assessment(\/\d+)?$/);
            await expect(dashboard.assessmentDetail).toBeVisible();
            await dashboard.selectView('aggregated');
            await expect(page).toHaveURL(/#aggregated$/);
            await expect(dashboard.panel('Scoreboard')).toBeVisible();
        });

        test('sends a trainee away from the dashboard', async ({ openAs, shared }) => {
            await expectRedirectedAway(openAs, 'trainee', `/linear-instance/${shared.trainingInstance.id}/analysis`);
        });
    });

    test.describe('aggregated view', () => {
        test.beforeEach(async () => {
            await dashboard.open('aggregated');
        });

        test('groups the panels under Live status, Standings, Level analysis and Commands', async ({ page }) => {
            for (const label of ['Live status', 'Standings', 'Level analysis', 'Commands']) {
                await expect(page.getByRole('heading', { level: 2, name: label, exact: true })).toBeVisible();
            }
        });

        test('shows the eight tiles of the data overview', async ({ checkpoint, page }) => {
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
                await expect(dashboard.overviewTile(label)).toBeVisible();
            }
            await checkpoint(page, 'aggregated view with the data overview');
        });

        test('counts the three finished trainees in the Trainees tile', async () => {
            const tile = dashboard.overviewTile('Trainees');
            await expect(tile.locator('.data-overview__tile-value')).toHaveText('3');
            await expect(tile.locator('.data-overview__tile-caption')).toHaveText('0 active · 3 done (100%)');
        });

        test('shows the average score of the trainees against the maximum score', async () => {
            const tile = dashboard.overviewTile('Avg score');
            await expect(tile.locator('.data-overview__tile-value')).toHaveText(
                String(Math.round(expectedInstanceTotals().averageScore)),
            );
            await expect(tile.locator('.data-overview__tile-caption')).toHaveText(`of ${MAXIMUM_TOTAL_SCORE}`);
        });

        test('shows the hints and solutions the trainees took', async () => {
            const totals = expectedInstanceTotals();
            const tile = dashboard.overviewTile('Hints & solutions');
            await expect(tile.locator('.data-overview__tile-value')).toHaveText(
                `${totals.hints} · ${totals.solutions}`,
            );
            await expect(tile.locator('.data-overview__tile-caption')).toHaveText('hints · solutions');
        });

        test('shows the average duration of the ended runs', async () => {
            await expect(dashboard.overviewTile('Avg duration').locator('.data-overview__tile-value')).not.toHaveText(
                '—',
            );
        });

        test('renders every aggregated panel without a load error', async ({ checkpoint, page, reviewRuns }) => {
            for (const heading of AGGREGATED_PANELS) {
                const panel = dashboard.panel(heading);
                await expect(panel, `${heading} panel`).toBeVisible();
                await expect(dashboard.errorPlaceholder(panel), `${heading} error`).toHaveCount(0);
            }
            await expect(errorDialog(page)).toHaveCount(0);
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

        test.describe('scoreboard', () => {
            test('ranks the trainees by total score, highest first', async ({ reviewRuns }) => {
                const rows = dashboard.panel('Scoreboard').locator('tbody tr[data-run-id]');
                await expect(rows).toHaveCount(BROWSER_KEYS.length);
                await expect.poll(() => browsersInOrder(rows, reviewRuns)).toEqual(browsersByRank());
            });

            test('shows rank, name, finished state and score of every trainee', async ({ reviewRuns }) => {
                const ranking = browsersByRank();
                for (const browser of BROWSER_KEYS) {
                    const row = dashboard.scoreboardRow(reviewRuns[browser].runId);
                    await expect(row).toContainText(reviewRuns[browser].traineeName);
                    await expect(row.locator('td').first()).toHaveText(String(ranking.indexOf(browser) + 1));
                    await expect(row.locator('crczp-run-state-chip')).toHaveText('Finished');
                    await expect(row).toContainText(
                        `${expectedResultOf(browser).totalScore} / ${MAXIMUM_TOTAL_SCORE}`,
                    );
                }
            });

            for (const [header, order] of [
                ['#', (browser: BrowserKey) => browsersByRank().indexOf(browser)],
                ['Score', (browser: BrowserKey) => expectedResultOf(browser).totalScore],
            ] as const) {
                test(`orders the trainees by ${header} in both directions`, async ({ reviewRuns }) => {
                    const panel = dashboard.panel('Scoreboard');
                    const rows = panel.locator('tbody tr[data-run-id]');
                    const headerCell = panel.getByRole('columnheader', { name: header, exact: true });
                    await expectOrderInBothDirections(headerCell, rows, reviewRuns, browsersSortedBy(order));
                });
            }

            test('orders the trainees by name in both directions', async ({ reviewRuns }) => {
                const panel = dashboard.panel('Scoreboard');
                const rows = panel.locator('tbody tr[data-run-id]');
                const headerCell = panel.getByRole('columnheader', { name: 'Trainee', exact: true });
                await expectOrderInBothDirections(
                    headerCell,
                    rows,
                    reviewRuns,
                    browsersSortedBy((browser) => reviewRuns[browser].traineeName),
                );
            });

            for (const header of ['State', 'Time']) {
                test(`marks the ${header} column as sorted when its header is clicked`, async () => {
                    const panel = dashboard.panel('Scoreboard');
                    const headerCell = panel.getByRole('columnheader', { name: header, exact: true });
                    await headerCell.click();
                    await expect(headerCell).toHaveAttribute('aria-sort', /ascending|descending/);
                    await expect(panel.locator('tbody tr[data-run-id]')).toHaveCount(BROWSER_KEYS.length);
                });
            }

            test('downloads the scoreboard as scoreboard.csv with a row per trainee', async ({ reviewRuns }) => {
                const { download, records } = await dashboard.downloadCsvRecords(dashboard.panel('Scoreboard'));
                expect(download.fileName).toBe('scoreboard.csv');
                expect(download.size).toBeGreaterThan(0);
                const ranking = browsersByRank();
                for (const browser of BROWSER_KEYS) {
                    const expected = expectedResultOf(browser);
                    const record = recordOf(records, 'Email', reviewRuns[browser].traineeMail);
                    expect(record, `scoreboard row of ${browser}`).toBeDefined();
                    expect(record?.['Rank']).toBe(String(ranking.indexOf(browser) + 1));
                    expect(record?.['Trainee name']).toBe(reviewRuns[browser].traineeName);
                    expect(record?.['State']).toBe('Finished');
                    expect(record?.['Training score']).toBe(String(expected.trainingScore));
                    expect(record?.['Assessment score']).toBe(String(expected.assessmentScore));
                    expect(record?.['Max score']).toBe(String(MAXIMUM_TOTAL_SCORE));
                    expect(Number(record?.['Score %'])).toBeCloseTo(
                        (expected.totalScore / MAXIMUM_TOTAL_SCORE) * 100,
                        0,
                    );
                }
            });
        });

        test.describe('live event feed', () => {
            test('lists recent events of the three trainees', async ({ reviewRuns }) => {
                const entries = dashboard.panel('Live event feed').getByRole('listitem');
                await expect(entries.first()).toBeVisible();
                const names = BROWSER_KEYS.map((browser) => reviewRuns[browser].traineeName);
                for (const text of await entries.allInnerTexts()) {
                    expect(names.some((name) => text.includes(name))).toBe(true);
                }
            });
        });

        test.describe('progress', () => {
            test('shows a step with its active trainee count for every level of the training', async () => {
                const steps = dashboard.panel('Progress').locator('crczp-progress-stepper .progress-stepper-step');
                for (const title of LEVEL_TITLES) {
                    const step = steps.filter({ hasText: title });
                    await expect(step, title).toHaveCount(1);
                    await expect(step).toContainText(/\d+ active/);
                }
            });

            test('explains the panel through its info button', async ({ page }) => {
                const panel = dashboard.panel('Progress');
                await expect(dashboard.infoButton(panel)).toBeVisible();
                await hoverTooltipTrigger(page, dashboard.infoButton(panel));
                await expect(visibleTooltip(page)).toContainText('Per-trainee progress across levels');
            });

            test('switches the time axis between clock and duration', async () => {
                const panel = dashboard.panel('Progress');
                const clock = panel.locator('mat-button-toggle').filter({ hasText: 'Clock' });
                const duration = panel.locator('mat-button-toggle').filter({ hasText: 'Duration' });
                await duration.locator('button').click();
                await expect(duration).toHaveClass(/mat-button-toggle-checked/);
                await clock.locator('button').click();
                await expect(clock).toHaveClass(/mat-button-toggle-checked/);
            });

            test('offers the six sort criteria and applies the chosen one', async ({ page }) => {
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
                    await expect(page.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
                }
                await page.getByRole('menuitem', { name: 'Score', exact: true }).click();
                await expect(panel.getByRole('button', { name: /Sort:/ })).toContainText('Score');
            });

            test('reverses the sort direction with the direction button', async () => {
                const panel = dashboard.panel('Progress');
                const icon = panel.locator('.chart-controls__sort-direction mat-icon');
                const before = await icon.innerText();
                await panel.locator('.chart-controls__sort-direction').click();
                await expect(icon).not.toHaveText(before.trim());
            });

            test('disables Clear while no trainee is marked as favourite', async () => {
                await expect(control(dashboard.panel('Progress'), 'Clear')).toBeDisabled();
            });
        });

        test.describe('current players per level', () => {
            test('shows the empty message because every trainee finished', async () => {
                const panel = dashboard.panel('Current players per level');
                await expect(dashboard.emptyPlaceholder(panel)).toBeVisible();
            });
        });

        test.describe('score attainment', () => {
            test('downloads score-attainment.csv with the score of every trainee', async ({ reviewRuns }) => {
                const { download, records } = await dashboard.downloadCsvRecords(dashboard.panel('Score attainment'));
                expect(download.fileName).toBe('score-attainment.csv');
                for (const browser of BROWSER_KEYS) {
                    const record = recordOf(records, 'Email', reviewRuns[browser].traineeMail);
                    expect(record, `score attainment row of ${browser}`).toBeDefined();
                    expect(record?.['Trainee']).toBe(reviewRuns[browser].traineeName);
                    expect(record?.['Total score']).toBe(String(expectedResultOf(browser).totalScore));
                    expect(record?.['Max score']).toBe(String(MAXIMUM_TOTAL_SCORE));
                    expect(record?.['Run state']).toMatch(/finished/i);
                }
            });
        });

        test.describe('level difficulty', () => {
            test('downloads the level counts of wrong answers, hints and solutions', async ({ shared }) => {
                const { download, records } = await dashboard.downloadCsvRecords(
                    dashboard.panel('Difficulty distribution by level'),
                );
                expect(download.fileName).toBe(`level-difficulty-${shared.trainingInstance.id}.csv`);
                const totals = expectedInstanceTotals();
                const first = recordOf(records, 'Level name', SHARED_TRAINING_LEVEL_TITLES.firstTraining);
                const second = recordOf(records, 'Level name', SHARED_TRAINING_LEVEL_TITLES.secondTraining);
                expect(first?.['Started trainees']).toBe(String(BROWSER_KEYS.length));
                expect(first?.['Wrong answers']).toBe(String(totals.wrongFlagAnswers));
                expect(first?.['Hints']).toBe(String(totals.hints));
                expect(first?.['Solution']).toBe('0');
                expect(second?.['Started trainees']).toBe(String(BROWSER_KEYS.length));
                expect(second?.['Wrong answers']).toBe('0');
                expect(second?.['Hints']).toBe('0');
                expect(second?.['Solution']).toBe(
                    String(BROWSER_KEYS.filter((browser) => TRAINEE_PLAYS[browser].showsSolutionOnSecondTraining).length),
                );
                const variant = recordOf(records, 'Level name', SHARED_TRAINING_LEVEL_TITLES.variantTraining);
                expect(variant?.['Started trainees']).toBe(String(BROWSER_KEYS.length));
                expect(variant?.['Wrong answers']).toBe('0');
                expect(variant?.['Hints']).toBe('0');
                expect(variant?.['Solution']).toBe(String(BROWSER_KEYS.length));
            });
        });

        test.describe('top wrong answers', () => {
            test('downloads top-wrong-answers.csv with one row per wrong submission', async ({ reviewRuns }) => {
                const { download, records } = await dashboard.downloadCsvRecords(
                    dashboard.panel('Top wrong answers'),
                );
                expect(download.fileName).toBe('top-wrong-answers.csv');
                expect(records).toHaveLength(expectedInstanceTotals().wrongAnswers);
                for (const record of records) {
                    const isPasskey = record['Answer'] === WRONG_PASSKEY;
                    if (!isPasskey) {
                        expect(record['Answer']).toMatch(new RegExp(`^${WRONG_FLAG}-\\d+$`));
                    }
                    expect(record['Level']).toBe(
                        isPasskey ? SHARED_TRAINING_LEVEL_TITLES.access : SHARED_TRAINING_LEVEL_TITLES.firstTraining,
                    );
                }
                for (const browser of BROWSER_KEYS) {
                    const submissions = records.filter(
                        (record) => record['Trainee'] === reviewRuns[browser].traineeName,
                    );
                    expect(submissions, `wrong submissions of ${browser}`).toHaveLength(
                        expectedResultOf(browser).wrongAnswers,
                    );
                }
            });

            test('offers a pie and a bar presentation of the wrong answers', async () => {
                const panel = dashboard.panel('Top wrong answers');
                const bar = panel.locator('mat-button-toggle').filter({ hasText: 'Bar' });
                const pie = panel.locator('mat-button-toggle').filter({ hasText: 'Pie' });
                await bar.locator('button').click();
                await expect(bar).toHaveClass(/mat-button-toggle-checked/);
                await pie.locator('button').click();
                await expect(pie).toHaveClass(/mat-button-toggle-checked/);
            });
        });

        test.describe('time vs expected per level', () => {
            test('downloads time-vs-expected-per-level.csv with the level visits of every trainee', async ({
                reviewRuns,
            }) => {
                const { download, records } = await dashboard.downloadCsvRecords(
                    dashboard.panel('Time vs expected per level'),
                );
                expect(download.fileName).toBe('time-vs-expected-per-level.csv');
                for (const browser of BROWSER_KEYS) {
                    const visits = records.filter((record) => record['Email'] === reviewRuns[browser].traineeMail);
                    expect(visits.map((visit) => visit['Level']), `level visits of ${browser}`).toEqual(
                        expect.arrayContaining([
                            SHARED_TRAINING_LEVEL_TITLES.firstTraining,
                            SHARED_TRAINING_LEVEL_TITLES.secondTraining,
                        ]),
                    );
                }
            });
        });

        test.describe('commands', () => {
            test('shows the empty message because the trainees issued no commands', async () => {
                const panel = dashboard.panel('Commands');
                await expect(dashboard.emptyPlaceholder(panel)).toBeVisible();
            });
        });
    });

    test.describe('individual view', () => {
        test('lists the three trainees and selects the first one', async ({ checkpoint, page, reviewRuns }) => {
            await dashboard.open('individual');
            await expect(dashboard.traineeTableRows).toHaveCount(BROWSER_KEYS.length);
            await expect(page.locator('crczp-trainee-table')).toContainText(`${BROWSER_KEYS.length} in this run`);
            await expect(dashboard.traineeCard).not.toContainText('Select a trainee');
            for (const header of ['Trainee', 'Time', 'Current level', 'In level', 'Score']) {
                await expect(
                    page.locator('crczp-trainee-table').getByRole('columnheader', { name: header, exact: true }),
                ).toBeVisible();
            }
            for (const browser of BROWSER_KEYS) {
                await expect(dashboard.traineeTableRow(reviewRuns[browser].traineeName)).toHaveCount(1);
            }
            await checkpoint(page, 'individual view with the first trainee selected');
        });

        test('shows the total score and a finished marker of every trainee in the table', async ({
            reviewRuns,
        }) => {
            await dashboard.open('individual');
            for (const browser of BROWSER_KEYS) {
                const row = dashboard.traineeTableRow(reviewRuns[browser].traineeName);
                await expect(row.locator('td').last()).toHaveText(String(expectedResultOf(browser).totalScore));
                await expect(row.locator('crczp-run-state-chip')).toHaveText('Finished');
            }
        });

        test('orders the trainees by score in both directions', async ({ page, reviewRuns }) => {
            await dashboard.open('individual');
            const headerCell = page
                .locator('crczp-trainee-table')
                .getByRole('columnheader', { name: 'Score', exact: true });
            await expectOrderInBothDirections(
                headerCell,
                dashboard.traineeTableRows,
                reviewRuns,
                browsersSortedBy((browser) => expectedResultOf(browser).totalScore),
            );
        });

        test('orders the trainees by name in both directions', async ({ page, reviewRuns }) => {
            await dashboard.open('individual');
            const headerCell = page
                .locator('crczp-trainee-table')
                .getByRole('columnheader', { name: 'Trainee', exact: true });
            await expectOrderInBothDirections(
                headerCell,
                dashboard.traineeTableRows,
                reviewRuns,
                browsersSortedBy((browser) => reviewRuns[browser].traineeName),
            );
        });

        for (const header of ['Time', 'Current level', 'In level']) {
            test(`marks the ${header} column as sorted when its header is clicked`, async ({ page }) => {
                await dashboard.open('individual');
                const headerCell = page
                    .locator('crczp-trainee-table')
                    .getByRole('columnheader', { name: header, exact: true });
                await headerCell.click();
                await expect(headerCell).toHaveAttribute('aria-sort', /ascending|descending/);
                await expect(dashboard.traineeTableRows).toHaveCount(BROWSER_KEYS.length);
            });
        }

        test('selects a trainee by clicking the row and records the run in the address', async ({
            checkpoint,
            page,
            reviewRuns,
        }) => {
            await dashboard.open('individual');
            const run = reviewRuns.chromium;
            await dashboard.traineeTableRow(run.traineeName).click();
            await expect(page).toHaveURL(new RegExp(`#individual/${run.runId}$`));
            await expect(dashboard.traineeCard).toContainText(run.traineeName);
            await expect(dashboard.traineeCard).toContainText(run.traineeMail);
            await checkpoint(page, 'trainee selected in the individual view');
        });

        test('selects the trainee named by the run in the address', async ({ reviewRuns }) => {
            await dashboard.open('individual', reviewRuns.firefox.runId);
            await expect(dashboard.traineeCard).toContainText(reviewRuns.firefox.traineeName);
        });

        for (const browser of BROWSER_KEYS) {
            test(`summarises the run of the ${browser} trainee on the trainee card`, async ({ reviewRuns }) => {
                const expected = expectedResultOf(browser);
                await dashboard.open('individual', reviewRuns[browser].runId);
                await expect(dashboard.traineeCardStat('State')).toContainText('Finished');
                await expect(dashboard.traineeCardStat('Score')).toContainText(String(expected.totalScore));
                await expect(dashboard.traineeCardStat('Score')).toContainText(
                    `${expected.assessmentScore} assessment`,
                );
                await expect(dashboard.traineeCardStat('Levels')).toHaveText(/(\d+)\/\1/);
                await expect(dashboard.traineeCardStat('Wrong')).toContainText(String(expected.wrongAnswers));
                await expect(dashboard.traineeCardStat('Hints')).toContainText(String(expected.hints));
                await expect(dashboard.traineeCardStat('Solutions')).toContainText(String(expected.solutions));
            });

            test(`breaks the score of the ${browser} trainee down by level on the trainee card`, async ({
                reviewRuns,
            }) => {
                await dashboard.open('individual', reviewRuns[browser].runId);
                for (const level of expectedResultOf(browser).levelScores) {
                    await expect(
                        dashboard.traineeCardLevels.filter({ hasText: level.title }).locator('.trainee-card__level-score'),
                        `score of ${level.title}`,
                    ).toHaveText(`${level.score}/${level.maximum}`);
                }
            });
        }

        test('gives every trainee a different variant answer, which the platform holds as that run\'s answer', async ({
            apiAs,
            reviewRuns,
        }) => {
            const submitted = BROWSER_KEYS.map((browser) => readChainRecord(browser).variantAnswer);
            expect(submitted.every((answer) => answer !== undefined && answer !== '')).toBe(true);
            expect(new Set(submitted).size, 'distinct variant answers').toBe(BROWSER_KEYS.length);
            for (const browser of BROWSER_KEYS) {
                const answers = await apiAs('trainingOrganizer').training.get<
                    { level_title: string; correct_answer: string }[]
                >(`/training-runs/${reviewRuns[browser].runId}/answers`);
                const variantAnswer = answers.find(
                    (answer) => answer.level_title === SHARED_TRAINING_LEVEL_TITLES.variantTraining,
                );
                expect(variantAnswer?.correct_answer, `variant answer of ${browser}`).toBe(
                    readChainRecord(browser).variantAnswer,
                );
            }
        });

        for (const browser of BROWSER_KEYS) {
            test(`shows the variant level of the ${browser} trainee solved`, async ({ reviewRuns }) => {
                await dashboard.open('individual', reviewRuns[browser].runId);
                await expect(dashboard.traineeCardStat('Levels')).toContainText(
                    `${SHARED_TRAINING_LEVEL_ORDER.length}/${SHARED_TRAINING_LEVEL_ORDER.length}`,
                );
                const variantLevel = dashboard.traineeCardLevels.filter({
                    hasText: SHARED_TRAINING_LEVEL_TITLES.variantTraining,
                });
                await expect(variantLevel).toContainText('1 solution');
            });
        }

        test('lists the wrong answers, hints and solutions on the level rows of the trainee card', async ({
            reviewRuns,
        }) => {
            await dashboard.open('individual', reviewRuns.webkit.runId);
            const first = dashboard.traineeCardLevels.filter({
                hasText: SHARED_TRAINING_LEVEL_TITLES.firstTraining,
            });
            await expect(first).toContainText('2 wrong answers');
            await expect(first).toContainText('2 hints');
            await dashboard.open('individual', reviewRuns.firefox.runId);
            const second = dashboard.traineeCardLevels.filter({
                hasText: SHARED_TRAINING_LEVEL_TITLES.secondTraining,
            });
            await expect(second).toContainText('1 solution');
        });

        test('renders the charts of the selected run without a load error', async ({ checkpoint, page, reviewRuns }) => {
            await dashboard.open('individual', reviewRuns.chromium.runId);
            for (const heading of [
                'Cumulative score',
                'Time vs score per level',
                'Wrong answers',
                'Event timeline',
                'Commands log',
            ]) {
                const panel = dashboard.panel(heading);
                await expect(panel, `${heading} panel`).toBeVisible();
                await expect(dashboard.errorPlaceholder(panel), `${heading} error`).toHaveCount(0);
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

        for (const browser of BROWSER_KEYS) {
            test(`downloads the cumulative score of the ${browser} trainee level by level`, async ({
                reviewRuns,
            }) => {
                const run = reviewRuns[browser];
                const expected = expectedResultOf(browser);
                await dashboard.open('individual', run.runId);
                const { download, records } = await dashboard.downloadCsvRecords(
                    dashboard.panel('Cumulative score'),
                );
                expect(download.fileName).toBe(`cumulative-score-run-${run.runId}.csv`);
                for (const level of expected.levelScores) {
                    const record = recordOf(records, 'Title', level.title);
                    expect(record?.['Gained this level'], `score of ${level.title}`).toBe(String(level.score));
                    expect(record?.['Level max'], `maximum of ${level.title}`).toBe(String(level.maximum));
                }
                expect(records.at(-1)?.['Cumulative max']).toBe(String(MAXIMUM_TOTAL_SCORE));
                expect(records.at(-1)?.['Actual cumulative']).toBe(String(expected.totalScore));
            });

            test(`downloads the points earned by the ${browser} trainee against the time per level`, async ({
                reviewRuns,
            }) => {
                const run = reviewRuns[browser];
                const expected = expectedResultOf(browser);
                await dashboard.open('individual', run.runId);
                const { download, records } = await dashboard.downloadCsvRecords(
                    dashboard.panel('Time vs score per level'),
                );
                expect(download.fileName).toBe(`time-vs-score-run-${run.runId}.csv`);
                for (const level of expected.levelScores) {
                    expect(recordOf(records, 'Title', level.title)?.['Points earned'], `score of ${level.title}`).toBe(
                        String(level.score),
                    );
                }
            });

            test(`downloads the event timeline of the ${browser} trainee with its wrong answers and hints`, async ({
                reviewRuns,
            }) => {
                const run = reviewRuns[browser];
                const expected = expectedResultOf(browser);
                await dashboard.open('individual', run.runId);
                const { download, records } = await dashboard.downloadCsvRecords(dashboard.panel('Event timeline'));
                expect(download.fileName).toBe(`event-timeline-run-${run.runId}.csv`);
                expect(records.length).toBeGreaterThan(0);
                expect(records.every((record) => record['Trainee'] === run.traineeName)).toBe(true);
                expect(records.filter((record) => record['Answer'].startsWith(WRONG_FLAG))).toHaveLength(
                    expected.wrongFlagAnswers,
                );
                expect(records.filter((record) => record['Hint'] !== '')).toHaveLength(expected.hints);
            });
        }

        test('downloads the wrong answers of the selected trainee as trainee-wrong-answers.csv', async ({
            reviewRuns,
        }) => {
            await dashboard.open('individual', reviewRuns.webkit.runId);
            const panel = dashboard.panel('Wrong answers');
            const { download, records } = await dashboard.downloadCsvRecords(panel);
            expect(download.fileName).toBe('trainee-wrong-answers.csv');
            expect(records).toHaveLength(expectedResultOf('webkit').wrongAnswers);
            expect(records.map((record) => record['Attempt'])).toEqual(['0', '1', '2']);
            await expect(panel.locator('mat-button-toggle').filter({ hasText: 'Pie' })).toBeVisible();
            await expect(panel.locator('mat-button-toggle').filter({ hasText: 'Bar' })).toBeVisible();
        });

        test('lists only the wrong passkey of a trainee who made no wrong flag submission', async ({
            reviewRuns,
        }) => {
            await dashboard.open('individual', reviewRuns.firefox.runId);
            const panel = dashboard.panel('Wrong answers');
            const { records } = await dashboard.downloadCsvRecords(panel);
            expect(records).toHaveLength(expectedResultOf('firefox').wrongAnswers);
            expect(records.map((record) => record['Answer'])).toEqual([WRONG_PASSKEY]);
            expect(records.map((record) => record['Level'])).toEqual([SHARED_TRAINING_LEVEL_TITLES.access]);
            await expect(panel).not.toContainText('No wrong answers from this trainee');
        });

        test('shows the empty message in the commands log because the trainee issued no commands', async ({
            reviewRuns,
        }) => {
            await dashboard.open('individual', reviewRuns.chromium.runId);
            const panel = dashboard.panel('Commands log');
            await expect(dashboard.errorPlaceholder(panel)).toHaveCount(0);
            await expect(panel.locator('tbody tr')).toHaveCount(0);
        });
    });

    test.describe('assessment view', () => {
        test.beforeEach(async () => {
            await dashboard.open('assessment');
        });

        test('shows the assessment with its kind, title and statistics', async ({ checkpoint, page }) => {
            const detail = dashboard.assessmentDetail;
            await expect(detail).toContainText(SHARED_TRAINING_LEVEL_TITLES.assessment);
            await expect(detail.locator('.assessment-detail--kind')).toHaveText('TEST');
            await expect(dashboard.assessmentStat('Takers')).toContainText(String(BROWSER_KEYS.length));
            await expect(dashboard.assessmentStat('Questions')).toContainText(String(ASSESSMENT_QUESTION_TITLES.length));
            await expect(dashboard.assessmentStat('Max points')).toContainText(String(MAXIMUM_ASSESSMENT_SCORE));
            await checkpoint(page, 'assessment view');
        });

        test('shows the mean points of the takers as average points', async () => {
            const mean =
                BROWSER_KEYS.reduce((sum, browser) => sum + expectedResultOf(browser).assessmentScore, 0) /
                BROWSER_KEYS.length;
            await expect(dashboard.assessmentStat('Average points')).toContainText(String(Math.round(mean * 10) / 10));
        });

        test('disables the assessment picker because the training has one assessment', async ({ page }) => {
            await expect(page.getByRole('button', { name: 'Select assessment' })).toBeDisabled();
        });

        test('lists the three questions with their types', async () => {
            const frames = dashboard.questionFrames;
            await expect(frames).toHaveCount(ASSESSMENT_QUESTION_TITLES.length);
            const kinds = ['FFQ', 'MCQ', 'EMI'];
            for (const [index, title] of ASSESSMENT_QUESTION_TITLES.entries()) {
                await expect(frames.nth(index)).toContainText(title);
                await expect(frames.nth(index).locator('.question-frame--tag')).toHaveText(kinds[index]);
            }
        });

        test('lists every trainee in the roster with points, correct and answered counts', async ({
            reviewRuns,
        }) => {
            await expect(dashboard.rosterRows).toHaveCount(BROWSER_KEYS.length);
            for (const browser of BROWSER_KEYS) {
                const expected = expectedResultOf(browser);
                const row = dashboard.rosterRow(reviewRuns[browser].traineeName);
                await expect(row.getByRole('gridcell', { name: `Points gained ${expected.assessmentScore}` })).toBeVisible();
                await expect(
                    row.getByRole('gridcell', {
                        name: `Whole questions correct ${expected.correctAssessmentQuestions}/${ASSESSMENT_QUESTION_TITLES.length}`,
                    }),
                ).toBeVisible();
                await expect(
                    row.getByRole('gridcell', {
                        name: `Questions answered ${ASSESSMENT_QUESTION_TITLES.length}/${ASSESSMENT_QUESTION_TITLES.length}`,
                    }),
                ).toBeVisible();
            }
        });

        test('orders the roster by points in both directions', async ({ reviewRuns }) => {
            const header = dashboard.rosterHeader(/Pts|Points gained/);
            await expectOrderInBothDirections(
                header,
                dashboard.rosterRows,
                reviewRuns,
                browsersSortedBy((browser) => expectedResultOf(browser).assessmentScore),
                header.getByRole('button'),
            );
        });

        test('orders the roster by trainee name in both directions', async ({ reviewRuns }) => {
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
            test(`marks the roster column ${label.source} as sorted when its header is clicked`, async () => {
                const header = dashboard.rosterHeader(label);
                await header.getByRole('button').click();
                await expect(header).toHaveAttribute('aria-sort', /ascending|descending/);
                await expect(dashboard.rosterRows).toHaveCount(BROWSER_KEYS.length);
            });
        }

        test('focuses a trainee by clicking the roster row and records the run in the address', async ({
            page,
            reviewRuns,
        }) => {
            const run = reviewRuns.webkit;
            await dashboard.rosterRow(run.traineeName).click();
            await expect(page).toHaveURL(new RegExp(`#assessment/${run.runId}$`));
            await expect(dashboard.rosterRow(run.traineeName)).toHaveAttribute('aria-selected', 'true');
        });

        test('shows the trainees who chose each option of the multiple choice question', async ({
            reviewRuns,
        }) => {
            const frame = dashboard.questionFrames.nth(1);
            for (const option of ['SSH', 'DNS', 'NTP']) {
                const surface = dashboard.answerSurfaces(frame).filter({ hasText: option });
                const expectedChoosers = BROWSER_KEYS.filter(
                    (browser) => TRAINEE_PLAYS[browser].assessment.multipleChoice === option,
                );
                await expect(dashboard.faces(surface), `choosers of ${option}`).toHaveCount(
                    expectedChoosers.length,
                );
                for (const browser of expectedChoosers) {
                    await expect(
                        dashboard.faces(surface).and(
                            surface.getByRole('button', {
                                name: reviewRuns[browser].traineeName,
                                exact: true,
                            }),
                        ),
                    ).toHaveCount(1);
                }
            }
        });

        test('filters the answers of the free form question', async () => {
            const frame = dashboard.questionFrames.nth(0);
            const filter = frame.getByRole('searchbox', { name: 'Filter answers' });
            await expect(dashboard.answerSurfaces(frame).filter({ hasText: SHARED_TRAINING_ANSWERS.freeFormAnswer })).toBeVisible();
            await filter.fill('udp');
            await expect(dashboard.answerSurfaces(frame)).toHaveCount(1);
            await expect(dashboard.answerSurfaces(frame).first()).toContainText('udp');
            await filter.fill('zzzz');
            await expect(frame).toContainText('No matching answers.');
            await filter.fill('');
            await expect(dashboard.answerSurfaces(frame)).toHaveCount(2);
        });

        test('shows the trainees who chose each cell of the extended matching question', async () => {
            const cells = dashboard.questionFrames.nth(2).locator('crczp-emi-body crczp-answer-surface');
            await expect(cells).toHaveCount(4);
            const expectedFaces = [2, 1, 1, 2];
            for (const [index, count] of expectedFaces.entries()) {
                await expect(dashboard.faces(cells.nth(index)), `cell ${index}`).toHaveCount(count);
            }
        });

        test('highlights the choosers of an answer when the answer is clicked', async () => {
            const surface = dashboard.answerSurfaces(dashboard.questionFrames.nth(1)).filter({ hasText: 'SSH' });
            await surface.click();
            await expect(dashboard.questionFrames.nth(1).locator('.mcq-body--option--active')).toHaveCount(1);
            await surface.click();
            await expect(dashboard.questionFrames.nth(1).locator('.mcq-body--option--active')).toHaveCount(0);
        });

        test('downloads the assessment as a CSV named after it with the answer of every trainee', async ({
            reviewRuns,
        }) => {
            const download = await dashboard.downloadCsv(dashboard.assessmentDetail);
            expect(download.fileName).toBe(`${SHARED_TRAINING_LEVEL_TITLES.assessment}.csv`);
            expect(download.size).toBeGreaterThan(0);
            const records = parseCsvRecords(download.content);
            expect(records).toHaveLength(BROWSER_KEYS.length * ASSESSMENT_QUESTION_TITLES.length);
            for (const browser of BROWSER_KEYS) {
                const play = TRAINEE_PLAYS[browser].assessment;
                const rows = records.filter((record) => record['Email'] === reviewRuns[browser].traineeMail);
                expect(rows.map((row) => row['Question #'])).toEqual(['1', '2', '3']);
                expect(rows.map((row) => row['Type'])).toEqual(['FFQ', 'MCQ', 'EMI']);
                expect(rows[0]['Answer']).toBe(play.freeForm);
                expect(rows[1]['Answer']).toBe(play.multipleChoice);
                for (const [statement, option] of Object.entries(play.extendedMatching)) {
                    expect(rows[2]['Answer']).toContain(`${statement} → ${option}`);
                }
                for (const question of expectedResultOf(browser).questionScores) {
                    const row = recordOf(rows, 'Question', question.text);
                    expect(row, `row of "${question.text}" for ${browser}`).toBeDefined();
                    expect(row?.['Answered']).toBe('Yes');
                    expect(row?.['Correctness']).toBe(question.correct ? 'Correct' : 'Incorrect');
                    expect(row?.['Points gained']).toBe(String(question.score));
                    expect(row?.['Max points']).toBe(String(question.maximum));
                }
                expect(rows.reduce((sum, row) => sum + Number(row['Points gained']), 0)).toBe(
                    expectedResultOf(browser).assessmentScore,
                );
            }
        });
    });
});
