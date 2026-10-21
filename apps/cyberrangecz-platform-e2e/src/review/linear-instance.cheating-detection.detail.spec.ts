import { expectRedirectedAway } from '../support/route-guard';
import {
    detectionEventsUrl,
    detectionEventUrl,
    CHEATING_THRESHOLDS,
    createFinishedDetection,
    eventsOf,
    type DetectionEventPayload,
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

    let events: DetectionEventPayload[];

    test.beforeEach(async ({ page, apiAs, shared, ownDetection }) => {
        events = await eventsOf(apiAs('trainingOrganizer'), shared.trainingInstance.id, ownDetection.id);
        await page.goto(detectionEventsUrl(shared.trainingInstance.id, ownDetection.id));
        await waitForPageReady(page);
        await SentinelTable.in(page).waitUntilLoaded();
    });

    test('shows the page title of the detection detail', async ({ page, checkpoint }) => {
        await expect(pageTitle(page)).toHaveText('Cheating Detection Detail');
        await checkpoint(page, 'detection events loaded');
    });

    test('shows every column of the detection event table', async ({ page }) => {
        const table = SentinelTable.in(page);
        await expect(table.root.getByRole('columnheader')).toHaveCount(EVENT_COLUMNS.length);
        for (const column of EVENT_COLUMNS) {
            await expect(table.headerCell(column)).toBeVisible();
        }
    });

    test('lists one row for each detection event of the detection', async ({ page }) => {
        expect(events.length).toBeGreaterThan(0);
        await expect(SentinelTable.in(page).rows).toHaveCount(events.length);
    });

    test('lists an event of three participants for each training level', async ({ page }) => {
        const table = SentinelTable.in(page);
        for (const title of TRAINING_LEVEL_TITLES) {
            const row = table.rowByText(title);
            await expect(row).toHaveCount(1);
            await expect(await table.cell(row, /^number of participants$/i)).toHaveText(String(TRAINEE_COUNT));
            await expect(await table.cell(row, /^detection type$/i)).toHaveText('Time proximity');
        }
    });

    test('names the trainees of an event in its participants column', async ({ page, reviewRuns }) => {
        const table = SentinelTable.in(page);
        const row = table.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining);
        const participants = await table.cell(row, /^participants$/i);
        for (const run of Object.values(reviewRuns)) {
            await expect(participants).toContainText(run.traineeName);
        }
    });

    test('shows the level id as the training service reports it', async ({ page }) => {
        const table = SentinelTable.in(page);
        const event = events.find((candidate) => candidate.level_title === SHARED_TRAINING_LEVEL_TITLES.firstTraining);
        expect(event).toBeDefined();
        const row = table.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining);
        await expect(await table.cell(row, /^level id$/i)).toHaveText(String(event?.level_id));
    });

    test('starts sorted by the level order ascending', async ({ page }) => {
        const table = SentinelTable.in(page);
        await expect(table.headerCell(/^level order$/i)).toHaveAttribute('aria-sort', 'ascending');
        await expect
            .poll(async () => isOrdered((await table.columnTexts(/^level order$/i)).map(Number), 'ascending'))
            .toBe(true);
    });

    test('marks every column but the participants as sortable', async ({ page }) => {
        await expectColumnSortability(SentinelTable.in(page), SORTABLE_COLUMNS, UNSORTABLE_COLUMNS);
    });

    test('orders the events by level title in both directions', async ({ page }) => {
        const table = SentinelTable.in(page);
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
        await expect(table.headerCell(/^level title$/i)).toHaveAttribute('aria-sort', /ascending|descending/);
        const firstDirection = await table.headerCell(/^level title$/i).getAttribute('aria-sort');
        const expectedFirst = firstDirection === 'ascending' ? ascending : [...ascending].reverse();
        await expect.poll(async () => [...new Set(await titlesInOrder())]).toEqual(expectedFirst);
        await table.sortBy(/^level title$/i);
        await expect(table.headerCell(/^level title$/i)).not.toHaveAttribute('aria-sort', firstDirection ?? '');
        await expect.poll(async () => [...new Set(await titlesInOrder())]).toEqual([...expectedFirst].reverse());
    });

    test('offers the event detail as the only action of an event row', async ({ page }) => {
        const table = SentinelTable.in(page);
        const row = table.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining);
        await expect(row.locator('sentinel-table-actions button')).toHaveCount(1);
        await expect(table.rowAction(row, 'assessment')).toBeVisible();
    });

    test('opens the event detail from the show event detail action', async ({
        page,
        shared,
        ownDetection,
    }) => {
        const table = SentinelTable.in(page);
        const event = events.find((candidate) => candidate.level_title === SHARED_TRAINING_LEVEL_TITLES.firstTraining);
        await table.rowAction(table.rowByText(SHARED_TRAINING_LEVEL_TITLES.firstTraining), 'assessment').click();
        await expect(page).toHaveURL(
            new RegExp(`${detectionEventUrl(shared.trainingInstance.id, ownDetection.id, event?.id ?? -1)}$`),
        );
    });

    test('sends a trainee away from the detection events', async ({
        openAs,
        shared,
        ownDetection,
    }) => {
        await expectRedirectedAway(openAs, 'trainee', detectionEventsUrl(shared.trainingInstance.id, ownDetection.id));
    });
});

test.describe('linear-instance.cheating-detection.detail of a detection without events', () => {
    test.use({ account: 'trainingOrganizer' });

    test('shows the empty state message', async ({ page, apiAs, shared, browserKey, checkpoint }) => {
        const api = apiAs('trainingOrganizer');
        const detection = await createFinishedDetection(
            api,
            shared.trainingInstance.id,
            CHEATING_THRESHOLDS[browserKey].withoutEvents,
        );
        expect(await eventsOf(api, shared.trainingInstance.id, detection.id)).toHaveLength(0);
        await page.goto(detectionEventsUrl(shared.trainingInstance.id, detection.id));
        await waitForPageReady(page);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        await expect(table.emptyState).toContainText('No detection events for this training instance');
        await checkpoint(page, 'no detection events');
    });
});
