import { expectRedirectedAway } from '../support/route-guard';
import { test as emptyInstanceTest } from '../support/pages/training-instance/training-instance-test';
import {
    CHEATING_THRESHOLDS,
    CheatingDetectionOverview,
    createFinishedDetection,
    detectionEventsUrl,
    detectionsOf,
    eventsOf,
    waitForFinishedDetection,
    type CheatingDetectionPayload,
} from '../support/pages/review/cheating-detection';
import { expect, test } from '../support/pages/review/cheating-detection-test';
import { ACTIONS_COLUMN, expectColumnSortability, sortableHeaders } from '../support/pages/review/sort-headers';
import {
    captureDownload,
    ConfirmationDialog,
    control,
    errorDialog,
    hoverTooltipTrigger,
    notificationPopups,
    SentinelTable,
    visibleTooltip,
    waitForNotification,
    waitForPageReady,
} from '../support/ui';

const DETECTION_COLUMNS = [
    /^id$/i,
    /^executed at$/i,
    /^executed by$/i,
    /^state$/i,
    /^results$/i,
    /^stages$/i,
    ACTIONS_COLUMN,
];

const STAGE_TOOLTIPS = [
    /^Answer similarity detection: /,
    /^Location proximity detection: /,
    /^Time proximity detection: /,
    /^Minimal solve time detection: /,
    /^No commands detection: /,
    /^Forbidden commands detection: /,
];

test.describe('linear-instance.cheating-detection', () => {
    test.use({ account: 'trainingOrganizer' });

    let overview: CheatingDetectionOverview;

    test.beforeEach(async ({ page, shared, ownDetection }) => {
        expect(ownDetection.current_state).toBe('FINISHED');
        overview = new CheatingDetectionOverview(page, shared.trainingInstance.id);
        await overview.openShowingEveryDetection();
    });

    test('shows every column of the cheating detection table', async ({ page, checkpoint }) => {
        const table = overview.table;
        await expect(table.root.getByRole('columnheader')).toHaveCount(DETECTION_COLUMNS.length);
        for (const column of DETECTION_COLUMNS) {
            await expect(table.headerCell(column)).toBeVisible();
        }
        await checkpoint(page, 'cheating detection overview loaded');
    });

    test('starts sorted by the execution time, newest first', async () => {
        await expect(overview.table.headerCell(/^executed at$/i)).toHaveAttribute('aria-sort', 'descending');
    });

    test('offers sorting by id, execution time, executor, state and results, and no row selection', async () => {
        const table = overview.table;
        await expectColumnSortability(
            table,
            [/^id$/i, /^executed at$/i, /^executed by$/i, /^state$/i, /^results$/i],
            [/^stages$/i],
        );
        await expect(sortableHeaders(table)).toHaveCount(5);
        await expect(table.selectAllCheckbox).toHaveCount(0);
    });

    test('reloads the detections without an error when sorted by each sortable column', async ({
        page,
        ownDetection,
    }) => {
        const table = overview.table;
        for (const column of [/^id$/i, /^executed at$/i, /^executed by$/i, /^state$/i, /^results$/i]) {
            for (const direction of ['ascending', 'descending'] as const) {
                await table.sortTo(column, direction);
                await expect(errorDialog(page)).toHaveCount(0);
                await expect(await overview.rowOf(ownDetection.id)).toHaveCount(1);
            }
        }
    });

    test('lists a finished detection with its id, state and executor', async ({ ownDetection }) => {
        const table = overview.table;
        const row = await overview.rowOf(ownDetection.id);
        await expect(row).toHaveCount(1);
        await expect(await table.cell(row, /^state$/i)).toHaveText(/finished/i);
        await expect(await table.cell(row, /^executed by$/i)).not.toHaveText('');
        await expect(await table.cell(row, /^executed at$/i)).not.toHaveText('');
    });

    test('shows the number of detection events as the results of a finished detection', async ({
        apiAs,
        shared,
        ownDetection,
    }) => {
        const events = await eventsOf(apiAs('trainingOrganizer'), shared.trainingInstance.id, ownDetection.id);
        expect(events.length).toBeGreaterThan(0);
        const table = overview.table;
        const row = await overview.rowOf(ownDetection.id);
        await expect(await table.cell(row, /^results$/i)).toHaveText(String(events.length));
    });

    test('shows one stage icon per detection method', async ({ ownDetection }) => {
        const row = await overview.rowOf(ownDetection.id);
        await expect(overview.stageIcons(row)).toHaveCount(STAGE_TOOLTIPS.length);
    });

    test('marks the enabled time proximity stage as finished and the others as disabled', async ({
        ownDetection,
    }) => {
        const row = await overview.rowOf(ownDetection.id);
        const icons = overview.stageIcons(row);
        for (let index = 0; index < STAGE_TOOLTIPS.length; index++) {
            await expect(icons.nth(index).locator('mat-icon')).toHaveText(index === 2 ? 'check' : 'block');
        }
    });

    test('names the method and the proximity threshold in the time proximity stage tooltip', async ({
        page,
        ownDetection,
    }) => {
        const row = await overview.rowOf(ownDetection.id);
        await hoverTooltipTrigger(page, overview.stageIcons(row).nth(2));
        await expect(visibleTooltip(page)).toHaveText(
            new RegExp(`^Time proximity detection: FINISHED proximity: ${ownDetection.proximity_threshold} sec$`, 'i'),
        );
    });

    test('offers results, archive, run again and delete as the actions of a finished detection', async ({
        ownDetection,
    }) => {
        const table = overview.table;
        const row = await overview.rowOf(ownDetection.id);
        for (const icon of ['assessment', 'cloud_download', 'run_circle', 'delete']) {
            await expect(table.rowAction(row, icon)).toBeVisible();
        }
    });

    test('opens the detection events of a detection from the results action', async ({
        page,
        shared,
        ownDetection,
    }) => {
        const row = await overview.rowOf(ownDetection.id);
        await overview.table.rowAction(row, 'assessment').click();
        await expect(page).toHaveURL(
            new RegExp(`${detectionEventsUrl(shared.trainingInstance.id, ownDetection.id)}$`),
        );
    });

    test('downloads the archive of a detection as a zip file', async ({ page, ownDetection }) => {
        const row = await overview.rowOf(ownDetection.id);
        const download = await captureDownload(page, () => overview.table.rowAction(row, 'cloud_download').click());
        expect(download.fileName).toMatch(/\.zip$/);
        expect(download.size).toBeGreaterThan(0);
        await expect(errorDialog(page)).toHaveCount(0);
    });

    test('opens the create form from the Create Cheating Detection control', async ({ page, shared }) => {
        await control(page, 'Create Cheating Detection').click();
        await expect(page).toHaveURL(
            new RegExp(`/linear-instance/${shared.trainingInstance.id}/cheating-detection/create$`),
        );
    });

    test('sends a trainee away from the cheating detections', async ({ openAs, shared }) => {
        await expectRedirectedAway(openAs, 'trainee', `/linear-instance/${shared.trainingInstance.id}/cheating-detection`);
    });
});

test.describe('linear-instance.cheating-detection (actions that change a detection)', () => {
    test.use({ account: 'trainingOrganizer' });
    test.describe.configure({ mode: 'serial' });

    let overview: CheatingDetectionOverview;
    let disposable!: CheatingDetectionPayload;
    let disposablePrepared = false;

    test.beforeEach(async ({ page, apiAs, shared, browserKey }) => {
        const api = apiAs('trainingOrganizer');
        const threshold = CHEATING_THRESHOLDS[browserKey].disposable;
        if (!disposablePrepared) {
            disposable = await createFinishedDetection(api, shared.trainingInstance.id, threshold);
            disposablePrepared = true;
        }
        await waitForFinishedDetection(api, shared.trainingInstance.id, threshold);
        overview = new CheatingDetectionOverview(page, shared.trainingInstance.id);
    });

    test('asks for confirmation naming the detection before deleting it', async ({
        page,
        checkpoint,
    }) => {
        await overview.openShowingEveryDetection();
        const row = await overview.rowOf(disposable.id);
        await overview.table.rowAction(row, 'delete').click();
        const dialog = new ConfirmationDialog(page, 'Delete Cheating Detection');
        await expect(dialog.message).toHaveText(
            `Do you want to delete cheating detection "${disposable.id}"?`,
        );
        await expect(dialog.cancelButton).toHaveText(/Cancel/);
        await expect(dialog.confirmButton).toHaveText(/Delete/);
        await checkpoint(page, 'delete cheating detection confirmation open');
    });

    test('keeps the detection when the delete confirmation is cancelled', async ({
        page,
        apiAs,
        shared,
    }) => {
        await overview.openShowingEveryDetection();
        const row = await overview.rowOf(disposable.id);
        await overview.table.rowAction(row, 'delete').click();
        const dialog = new ConfirmationDialog(page, 'Delete Cheating Detection');
        await dialog.cancel();
        await expect(dialog.root).toBeHidden();
        await expect(await overview.rowOf(disposable.id)).toHaveCount(1);
        const detections = await detectionsOf(apiAs('trainingOrganizer'), shared.trainingInstance.id);
        expect(detections.map((detection) => detection.id)).toContain(disposable.id);
    });

    test('reruns a detection and reports it', async ({ page }) => {
        await overview.openShowingEveryDetection();
        const row = await overview.rowOf(disposable.id);
        await overview.table.rowAction(row, 'run_circle').click();
        const notification = await waitForNotification(page, 'Cheating Detection was re-executed.');
        expect(notification.kind).toBe('success');
    });

    test('deletes a detection after confirmation, reports it and removes it from the instance', async ({
        page,
        apiAs,
        shared,
        checkpoint,
    }) => {
        await overview.openShowingEveryDetection();
        const row = await overview.rowOf(disposable.id);
        await overview.table.rowAction(row, 'delete').click();
        await new ConfirmationDialog(page, 'Delete Cheating Detection').confirm();
        await expect(notificationPopups(page).filter({ hasText: 'Cheating Detection was deleted' })).toBeVisible();
        await expect(await overview.rowOf(disposable.id)).toHaveCount(0);
        await checkpoint(page, 'cheating detection deleted');
        await expect(async () => {
            const detections = await detectionsOf(apiAs('trainingOrganizer'), shared.trainingInstance.id);
            expect(detections.map((detection) => detection.id)).not.toContain(disposable.id);
        }).toPass({ timeout: 30_000, intervals: [1_000, 2_000] });
    });
});

emptyInstanceTest.describe('linear-instance.cheating-detection of an instance without detections', () => {
    emptyInstanceTest.use({ account: 'trainingOrganizer' });

    emptyInstanceTest('shows the empty state message', async ({ page, createInstance, checkpoint }) => {
        const instance = await createInstance({ purpose: 'no-detections' });
        await page.goto(`/linear-instance/${instance.id}/cheating-detection`);
        await waitForPageReady(page);
        const table = SentinelTable.in(page);
        await table.waitUntilLoaded();
        await expect(table.emptyState).toContainText('No cheating detections have been run yet');
        await expect(table.rows).toHaveCount(0);
        await checkpoint(page, 'no cheating detections yet');
    });
});
