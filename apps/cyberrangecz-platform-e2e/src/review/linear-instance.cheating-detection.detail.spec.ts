import {
    detectionEventsUrl,
    detectionEventUrl,
    CHEATING_THRESHOLDS,
    createFinishedDetection,
    eventsOf,
    findDetectionByThreshold,
} from '../support/pages/review/cheating-detection';
import { expect, test } from '../support/pages/review/cheating-detection-test';
import { SHARED_TRAINING_LEVEL_TITLES } from '../support/scenario/shared-training-loader';
import { ACTIONS_COLUMN, expectColumnSortability } from '../support/pages/review/sort-headers';
import { isOrdered, pageTitle, SentinelTable, waitForPageReady } from '../support/ui';

const EVENT_COLUMNS = [
    /^level order$/i,
    /^level title$/i,
    /^level id$/i,
    /^number of participants$/i,
    /^participants$/i,
    /^detection type$/i,
    ACTIONS_COLUMN,
];
const SORTABLE_COLUMNS = [
    /^level order$/i,
    /^level title$/i,
    /^level id$/i,
    /^number of participants$/i,
    /^detection type$/i,
];
const UNSORTABLE_COLUMNS = [/^participants$/i];
const TRAINING_LEVEL_TITLES = [
    SHARED_TRAINING_LEVEL_TITLES.firstTraining,
    SHARED_TRAINING_LEVEL_TITLES.secondTraining,
];
const TRAINEE_COUNT = 3;

test.describe('linear-instance.cheating-detection.detail', () => {
    test.use({ account: 'trainingOrganizer' });

    test('checks the detection events page and a detection without events', async ({
        page,
        apiAs,
        shared,
        ownDetection,
        reviewRuns,
        browserKey,
        checkpoint,
    }) => {
        test.setTimeout(240_000);
        const api = apiAs('trainingOrganizer');
        const events = await eventsOf(api, shared.trainingInstance.id, ownDetection.id);
        await page.goto(detectionEventsUrl(shared.trainingInstance.id, ownDetection.id));
        await waitForPageReady(page);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        const firstLevelEvent = events.find(
            (candidate) => candidate.level_title === SHARED_TRAINING_LEVEL_TITLES.firstTraining,
        );

        await test.step('shows the page title of the detection detail', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Cheating Detection Detail');
            await checkpoint(page, 'detection events loaded');
        });

        await test.step('shows every column of the detection event table', async () => {
            await expect.soft(table.root.getByRole('columnheader'), 'column count').toHaveCount(EVENT_COLUMNS.length);
            for (const column of EVENT_COLUMNS) {
                await expect.soft(table.headerCell(column), `column ${column}`).toBeVisible();
            }
        });

        await test.step('lists one row for each detection event of the detection', async () => {
            expect.soft(events.length, 'detection events').toBeGreaterThan(0);
            await expect.soft(table.rows, 'event rows').toHaveCount(events.length);
        });

        await test.step('lists an event of three participants for each training level', async () => {
            for (const title of TRAINING_LEVEL_TITLES) {
                const row = table.rowByText(title);
                await expect.soft(row, `row of ${title}`).toHaveCount(1);
                await expect
                    .soft(await table.cell(row, /^number of participants$/i), `participants of ${title}`)
                    .toHaveText(String(TRAINEE_COUNT));
                await expect
                    .soft(await table.cell(row, /^detection type$/i), `detection type of ${title}`)
                    .toHaveText('Time proximity');
            }
        });

        await test.step('names the trainees of an event in its participants column', async () => {
            const row = table.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining);
            const participants = await table.cell(row, /^participants$/i);
            for (const run of Object.values(reviewRuns)) {
                await expect.soft(participants, `participants naming ${run.traineeName}`).toContainText(run.traineeName);
            }
        });

        await test.step('shows the level id as the training service reports it', async () => {
            expect.soft(firstLevelEvent, 'event of the first training level').toBeDefined();
            const row = table.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining);
            await expect
                .soft(await table.cell(row, /^level id$/i), 'level id')
                .toHaveText(String(firstLevelEvent?.level_id));
        });

        await test.step('starts sorted by the level order ascending', async () => {
            await expect
                .soft(table.headerCell(/^level order$/i), 'level order header sort')
                .toHaveAttribute('aria-sort', 'ascending');
            await expect
                .configure({ soft: true })
                .poll(async () => isOrdered((await table.columnTexts(/^level order$/i)).map(Number), 'ascending'), {
                    message: 'level order ascending',
                })
                .toBe(true);
        });

        await test.step('marks every column but the participants as sortable', async () => {
            await expectColumnSortability(table, SORTABLE_COLUMNS, UNSORTABLE_COLUMNS);
        });

        await test.step('offers the event detail as the only action of an event row', async () => {
            const row = table.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining);
            await expect.soft(row.locator('sentinel-table-actions button'), 'row actions').toHaveCount(1);
            await expect.soft(table.rowAction(row, 'assessment'), 'event detail action').toBeVisible();
        });

        await test.step('orders the events by level title in both directions', async () => {
            const titlesInOrder = async (): Promise<string[]> => {
                const rows = await table.rows.all();
                return Promise.all(
                    rows.map(async (row) => (await (await table.cell(row, /^level title$/i)).innerText()).trim()),
                );
            };
            const ascending = [...new Set(events.map((event) => event.level_title))].sort((left, right) =>
                left.localeCompare(right),
            );
            await table.sortBy(/^level title$/i);
            await expect
                .soft(table.headerCell(/^level title$/i), 'level title header sort')
                .toHaveAttribute('aria-sort', /ascending|descending/);
            const firstDirection = await table.headerCell(/^level title$/i).getAttribute('aria-sort');
            const expectedFirst = firstDirection === 'ascending' ? ascending : [...ascending].reverse();
            await expect
                .configure({ soft: true })
                .poll(async () => [...new Set(await titlesInOrder())], { message: `titles ${firstDirection}` })
                .toEqual(expectedFirst);
            await table.sortBy(/^level title$/i);
            await expect
                .soft(table.headerCell(/^level title$/i), 'reversed header sort')
                .not.toHaveAttribute('aria-sort', firstDirection ?? '');
            await expect
                .configure({ soft: true })
                .poll(async () => [...new Set(await titlesInOrder())], { message: 'titles in the reversed direction' })
                .toEqual([...expectedFirst].reverse());
        });

        await test.step('opens the event detail from the show event detail action', async () => {
            await table.rowAction(table.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining), 'assessment').click();
            await expect(page).toHaveURL(
                new RegExp(`${detectionEventUrl(shared.trainingInstance.id, ownDetection.id, firstLevelEvent?.id ?? -1)}$`),
            );
        });

        await test.step('shows the empty state message of a detection without events', async () => {
            const withoutEventsThreshold = CHEATING_THRESHOLDS[browserKey].withoutEvents;
            const detection =
                (await findDetectionByThreshold(api, shared.trainingInstance.id, withoutEventsThreshold)) ??
                (await createFinishedDetection(api, shared.trainingInstance.id, withoutEventsThreshold));
            expect(await eventsOf(api, shared.trainingInstance.id, detection.id)).toHaveLength(0);
            await page.goto(detectionEventsUrl(shared.trainingInstance.id, detection.id));
            await waitForPageReady(page);
            await table.waitUntilLoaded();
            await expect.soft(table.emptyState, 'empty state').toContainText('No detection events for this training instance');
            await checkpoint(page, 'no detection events');
        });
    });
});
