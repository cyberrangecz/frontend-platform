import { expectRedirectedAway } from '../support/route-guard';
import type { Locator, Page } from '@playwright/test';
import { BROWSER_KEYS } from '../support/accounts';
import {
    detectionEventUrl,
    eventsOf,
    type DetectionEventPayload,
} from '../support/pages/review/cheating-detection';
import { expect, test } from '../support/pages/review/cheating-detection-test';
import { SHARED_TRAINING_LEVEL_TITLES } from '../support/scenario/shared-training-loader';
import { pageTitle, SentinelTable, waitForPageReady } from '../support/ui';

const PARTICIPANT_COLUMNS = [/^name$/i, /^occurred at$/i, /^ip address$/i, /^solved in time \(seconds\)$/i];
const TRAINING_LEVEL_TITLES = [
    SHARED_TRAINING_LEVEL_TITLES.firstTraining,
    SHARED_TRAINING_LEVEL_TITLES.secondTraining,
];

/** The value shown next to a label of the event's data fields. */
function dataField(page: Page, label: string): Locator {
    return page.locator('.data-field').filter({
        has: page.locator('.icon-label', { hasText: new RegExp(`^\\s*${label}\\s*$`) }),
    });
}

test.describe('linear-instance.cheating-detection.detail.event', () => {
    test.use({ account: 'trainingOrganizer' });

    let event: DetectionEventPayload;

    async function openEventOfLevel(
        page: Page,
        levelTitle: string,
        events: DetectionEventPayload[],
        instanceId: number,
        detectionId: number,
    ): Promise<DetectionEventPayload> {
        const found = events.find((candidate) => candidate.level_title === levelTitle);
        expect(found, `detection event of level "${levelTitle}"`).toBeDefined();
        const opened = found as DetectionEventPayload;
        await page.goto(detectionEventUrl(instanceId, detectionId, opened.id));
        await waitForPageReady(page);
        await dataField(page, 'Level Title').waitFor();
        return opened;
    }

    test.beforeEach(async ({ page, apiAs, shared, ownDetection }) => {
        const events = await eventsOf(apiAs('trainingOrganizer'), shared.trainingInstance.id, ownDetection.id);
        event = await openEventOfLevel(
            page,
            SHARED_TRAINING_LEVEL_TITLES.firstTraining,
            events,
            shared.trainingInstance.id,
            ownDetection.id,
        );
    });

    test('shows the page title of the detection event', async ({ page, checkpoint }) => {
        await expect(pageTitle(page)).toHaveText('Detection Event Detail');
        await checkpoint(page, 'detection event loaded');
    });

    test('shows when the detection ran', async ({ page }) => {
        await expect(dataField(page, 'Detection Run At').locator('.value-field')).not.toHaveText('');
    });

    test('shows the type of the event', async ({ page }) => {
        await expect(dataField(page, 'Type of Event').locator('.value-field')).toHaveText('Time proximity');
    });

    test('shows the title and the order of the level the event belongs to', async ({ page }) => {
        await expect(dataField(page, 'Level Title').locator('.value-field')).toHaveText(event.level_title);
        await expect(dataField(page, 'Level Order').locator('.value-field')).toHaveText(String(event.level_order));
    });

    test('shows the number of participants of the event', async ({ page }) => {
        await expect(dataField(page, 'Number of Participants').locator('.value-field')).toHaveText(
            String(event.participant_count),
        );
    });

    test('shows the proximity threshold of the detection in seconds', async ({ page, ownDetection }) => {
        await expect(dataField(page, 'Proximity Threshold').locator('.value-field')).toHaveText(
            `${ownDetection.proximity_threshold} seconds`,
        );
    });

    test('shows no fields that belong to other event types', async ({ page }) => {
        for (const label of ['Domain Name', 'Is Address of Deployment', 'Answer Owner', 'Answer', 'Minimal Solve Time']) {
            await expect(dataField(page, label)).toHaveCount(0);
        }
    });

    test('lists the participants table with its columns', async ({ page }) => {
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        await expect(page.getByRole('heading', { level: 1, name: 'Participants' })).toBeVisible();
        await expect(table.root.getByRole('columnheader')).toHaveCount(PARTICIPANT_COLUMNS.length);
        for (const column of PARTICIPANT_COLUMNS) {
            await expect(table.headerCell(column)).toBeVisible();
        }
    });

    test('starts the participants sorted by the time they answered, earliest first', async ({ page }) => {
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        await expect(table.headerCell(/^occurred at$/i)).toHaveAttribute('aria-sort', 'ascending');
    });

    test('lists the trainee of each browser as a participant of the event', async ({ page, reviewRuns }) => {
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        await expect(table.rows).toHaveCount(event.participant_count);
        for (const browser of BROWSER_KEYS) {
            await expect(table.rowByText(reviewRuns[browser].traineeName)).toHaveCount(1);
        }
    });

    test('shows when each participant answered', async ({ page }) => {
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        for (const row of await table.rows.all()) {
            await expect(await table.cell(row, /^occurred at$/i)).not.toHaveText(/^\s*$/);
        }
    });

    test('shows the second training level event with the same participants', async ({
        page,
        apiAs,
        shared,
        ownDetection,
        reviewRuns,
    }) => {
        const events = await eventsOf(apiAs('trainingOrganizer'), shared.trainingInstance.id, ownDetection.id);
        const second = await openEventOfLevel(
            page,
            SHARED_TRAINING_LEVEL_TITLES.secondTraining,
            events,
            shared.trainingInstance.id,
            ownDetection.id,
        );
        expect(TRAINING_LEVEL_TITLES).toContain(second.level_title);
        await expect(dataField(page, 'Level Title').locator('.value-field')).toHaveText(second.level_title);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        for (const browser of BROWSER_KEYS) {
            await expect(table.rowByText(reviewRuns[browser].traineeName)).toHaveCount(1);
        }
    });

    test('omits the forbidden commands table and the timeline for a time proximity event', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1, name: /^Forbidden Commands in/ })).toHaveCount(0);
        await expect(page.locator('mat-expansion-panel-header', { hasText: 'Timeline' })).toHaveCount(0);
    });

    test('sends a trainee away from the detection event', async ({
        openAs,
        shared,
        ownDetection,
    }) => {
        await expectRedirectedAway(openAs, 'trainee', detectionEventUrl(shared.trainingInstance.id, ownDetection.id, event.id));
    });
});
