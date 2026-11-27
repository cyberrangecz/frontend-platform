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

    test('checks the detection event page of both training levels', async ({
        page,
        apiAs,
        shared,
        ownDetection,
        reviewRuns,
        checkpoint,
    }) => {
        test.setTimeout(240_000);
        const events = await eventsOf(apiAs('trainingOrganizer'), shared.trainingInstance.id, ownDetection.id);
        const event = await openEventOfLevel(
            page,
            SHARED_TRAINING_LEVEL_TITLES.firstTraining,
            events,
            shared.trainingInstance.id,
            ownDetection.id,
        );
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();

        await test.step('shows the page title of the detection event', async () => {
            await expect.soft(pageTitle(page), 'page title').toHaveText('Detection Event Detail');
            await checkpoint(page, 'detection event loaded');
        });

        await test.step('shows when the detection ran', async () => {
            await expect
                .soft(dataField(page, 'Detection Run At').locator('.value-field'), 'detection run time')
                .not.toHaveText('');
        });

        await test.step('shows the type of the event', async () => {
            await expect
                .soft(dataField(page, 'Type of Event').locator('.value-field'), 'event type')
                .toHaveText('Time proximity');
        });

        await test.step('shows the title and the order of the level the event belongs to', async () => {
            await expect
                .soft(dataField(page, 'Level Title').locator('.value-field'), 'level title')
                .toHaveText(event.level_title);
            await expect
                .soft(dataField(page, 'Level Order').locator('.value-field'), 'level order')
                .toHaveText(String(event.level_order));
        });

        await test.step('shows the number of participants of the event', async () => {
            await expect
                .soft(dataField(page, 'Number of Participants').locator('.value-field'), 'participant count')
                .toHaveText(String(event.participant_count));
        });

        await test.step('shows the proximity threshold of the detection in seconds', async () => {
            await expect
                .soft(dataField(page, 'Proximity Threshold').locator('.value-field'), 'proximity threshold')
                .toHaveText(`${ownDetection.proximity_threshold} seconds`);
        });

        await test.step('shows no fields that belong to other event types', async () => {
            for (const label of [
                'Domain Name',
                'Is Address of Deployment',
                'Answer Owner',
                'Answer',
                'Minimal Solve Time',
            ]) {
                await expect.soft(dataField(page, label), `${label} field`).toHaveCount(0);
            }
        });

        await test.step('lists the participants table with its columns', async () => {
            await expect
                .soft(page.getByRole('heading', { level: 1, name: 'Participants' }), 'participants heading')
                .toBeVisible();
            await expect
                .soft(table.root.getByRole('columnheader'), 'column count')
                .toHaveCount(PARTICIPANT_COLUMNS.length);
            for (const column of PARTICIPANT_COLUMNS) {
                await expect.soft(table.headerCell(column), `column ${column}`).toBeVisible();
            }
        });

        await test.step('starts the participants sorted by the time they answered, earliest first', async () => {
            await expect
                .soft(table.headerCell(/^occurred at$/i), 'occurred at header sort')
                .toHaveAttribute('aria-sort', 'ascending');
        });

        await test.step('lists the trainee of each browser as a participant of the event', async () => {
            await expect.soft(table.rows, 'participant rows').toHaveCount(event.participant_count);
            for (const browser of BROWSER_KEYS) {
                await expect
                    .soft(table.rowByText(reviewRuns[browser].traineeName), `row of the ${browser} trainee`)
                    .toHaveCount(1);
            }
        });

        await test.step('shows when each participant answered', async () => {
            for (const row of await table.rows.all()) {
                await expect.soft(await table.cell(row, /^occurred at$/i), 'answer time').not.toHaveText(/^\s*$/);
            }
        });

        await test.step('omits the forbidden commands table and the timeline for a time proximity event', async () => {
            await expect
                .soft(page.getByRole('heading', { level: 1, name: /^Forbidden Commands in/ }), 'forbidden commands table')
                .toHaveCount(0);
            await expect
                .soft(page.locator('mat-expansion-panel-header', { hasText: 'Timeline' }), 'timeline panel')
                .toHaveCount(0);
        });

        await test.step('shows the second training level event with the same participants', async () => {
            const second = await openEventOfLevel(
                page,
                SHARED_TRAINING_LEVEL_TITLES.secondTraining,
                events,
                shared.trainingInstance.id,
                ownDetection.id,
            );
            expect.soft(TRAINING_LEVEL_TITLES, 'training level titles').toContain(second.level_title);
            await expect
                .soft(dataField(page, 'Level Title').locator('.value-field'), 'level title')
                .toHaveText(second.level_title);
            await table.waitUntilLoaded();
            for (const browser of BROWSER_KEYS) {
                await expect
                    .soft(table.rowByText(reviewRuns[browser].traineeName), `row of the ${browser} trainee`)
                    .toHaveCount(1);
            }
        });
    });
});
